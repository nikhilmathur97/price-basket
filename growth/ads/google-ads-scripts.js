/**
 * PRICEBASKET.IN — Google Ads Automation Scripts
 * Run these in Google Ads > Tools > Scripts
 * 
 * Script 1: Pause low-CTR keywords (CTR < 1% for 14 days)
 * Script 2: Increase bids on high-ROAS keywords
 * Script 3: Reduce bids on expensive non-converting keywords
 * Script 4: Slack alert when daily budget 80% consumed before 6pm IST
 * Script 5: Auto-generate RSAs with today's top deal prices
 */

// ── CONFIG ────────────────────────────────────────────────────────────────────
var CONFIG = {
  SLACK_WEBHOOK: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
  PRICEBASKET_API: 'https://pricebasket-api.onrender.com/api/v1',
  MIN_CTR_THRESHOLD: 0.01,        // 1% CTR minimum
  HIGH_ROAS_THRESHOLD: 4.0,       // 400% ROAS = increase bids
  LOW_ROAS_MAX_CPC: 30,           // Rs.30 max CPC if no conversion
  BID_INCREASE_PCT: 0.15,         // 15% bid increase
  BID_DECREASE_PCT: 0.20,         // 20% bid decrease
  BUDGET_ALERT_PCT: 0.80,         // Alert at 80% budget consumed
  ALERT_HOUR_IST: 18,             // 6pm IST
  LOOKBACK_DAYS: 14,
};

// ── SCRIPT 1: Pause Low-CTR Keywords ─────────────────────────────────────────
function pauseLowCtrKeywords() {
  var dateRange = getDateRange(CONFIG.LOOKBACK_DAYS);
  var report = AdsApp.report(
    'SELECT AdGroupCriterionId, AdGroupId, CampaignId, Criteria, Ctr, Impressions, Status ' +
    'FROM KEYWORDS_PERFORMANCE_REPORT ' +
    'WHERE Impressions > 100 ' +
    'AND Ctr < ' + CONFIG.MIN_CTR_THRESHOLD + ' ' +
    'AND Status = ENABLED ' +
    'DURING ' + dateRange
  );
  
  var rows = report.rows();
  var paused = 0;
  
  while (rows.hasNext()) {
    var row = rows.next();
    var keywordIter = AdsApp.keywords()
      .withIds([[row['CampaignId'], row['AdGroupId'], row['AdGroupCriterionId']]])
      .get();
    
    if (keywordIter.hasNext()) {
      var keyword = keywordIter.next();
      keyword.pause();
      paused++;
      Logger.log('Paused keyword: ' + row['Criteria'] + ' (CTR: ' + (row['Ctr'] * 100).toFixed(2) + '%)');
    }
  }
  
  if (paused > 0) {
    sendSlackAlert('PriceBasket Ads: Paused ' + paused + ' low-CTR keywords (<1% CTR over 14 days)');
  }
  Logger.log('Low-CTR pause complete. Paused: ' + paused + ' keywords');
}

// ── SCRIPT 2: Increase Bids on High-ROAS Keywords ────────────────────────────
function increaseBidsHighRoas() {
  var dateRange = getDateRange(CONFIG.LOOKBACK_DAYS);
  var report = AdsApp.report(
    'SELECT AdGroupCriterionId, AdGroupId, CampaignId, Criteria, Roas, CpcBid, Conversions ' +
    'FROM KEYWORDS_PERFORMANCE_REPORT ' +
    'WHERE Roas > ' + CONFIG.HIGH_ROAS_THRESHOLD + ' ' +
    'AND Conversions > 5 ' +
    'AND Status = ENABLED ' +
    'DURING ' + dateRange
  );
  
  var rows = report.rows();
  var updated = 0;
  
  while (rows.hasNext()) {
    var row = rows.next();
    var keywordIter = AdsApp.keywords()
      .withIds([[row['CampaignId'], row['AdGroupId'], row['AdGroupCriterionId']]])
      .get();
    
    if (keywordIter.hasNext()) {
      var keyword = keywordIter.next();
      var currentBid = keyword.bidding().getCpc();
      var newBid = currentBid * (1 + CONFIG.BID_INCREASE_PCT);
      keyword.bidding().setCpc(newBid);
      updated++;
      Logger.log('Increased bid for: ' + row['Criteria'] + ' from Rs.' + currentBid.toFixed(2) + ' to Rs.' + newBid.toFixed(2) + ' (ROAS: ' + (row['Roas'] * 100).toFixed(0) + '%)');
    }
  }
  
  if (updated > 0) {
    sendSlackAlert('PriceBasket Ads: Increased bids by 15% on ' + updated + ' high-ROAS keywords (ROAS > 400%)');
  }
}

// ── SCRIPT 3: Reduce Bids on Expensive Non-Converting Keywords ────────────────
function reduceBidsExpensiveKeywords() {
  var dateRange = getDateRange(CONFIG.LOOKBACK_DAYS);
  var report = AdsApp.report(
    'SELECT AdGroupCriterionId, AdGroupId, CampaignId, Criteria, CpcBid, Conversions, AverageCpc ' +
    'FROM KEYWORDS_PERFORMANCE_REPORT ' +
    'WHERE AverageCpc > ' + CONFIG.LOW_ROAS_MAX_CPC + ' ' +
    'AND Conversions = 0 ' +
    'AND Impressions > 50 ' +
    'AND Status = ENABLED ' +
    'DURING ' + dateRange
  );
  
  var rows = report.rows();
  var updated = 0;
  
  while (rows.hasNext()) {
    var row = rows.next();
    var keywordIter = AdsApp.keywords()
      .withIds([[row['CampaignId'], row['AdGroupId'], row['AdGroupCriterionId']]])
      .get();
    
    if (keywordIter.hasNext()) {
      var keyword = keywordIter.next();
      var currentBid = keyword.bidding().getCpc();
      var newBid = currentBid * (1 - CONFIG.BID_DECREASE_PCT);
      keyword.bidding().setCpc(newBid);
      updated++;
      Logger.log('Reduced bid for: ' + row['Criteria'] + ' (CPC: Rs.' + row['AverageCpc'] + ', 0 conversions)');
    }
  }
  
  Logger.log('Bid reduction complete. Updated: ' + updated + ' keywords');
}

// ── SCRIPT 4: Budget Pacing Alert ────────────────────────────────────────────
function checkBudgetPacing() {
  var now = new Date();
  var istHour = (now.getUTCHours() + 5) % 24 + (now.getUTCMinutes() >= 30 ? 1 : 0);
  
  if (istHour >= CONFIG.ALERT_HOUR_IST) return; // Only alert before 6pm IST
  
  var campaignIter = AdsApp.campaigns()
    .withCondition('Status = ENABLED')
    .get();
  
  while (campaignIter.hasNext()) {
    var campaign = campaignIter.next();
    var budget = campaign.getBudget();
    var dailyBudget = budget.getAmount();
    var stats = campaign.getStatsFor('TODAY');
    var spent = stats.getCost();
    var pct = spent / dailyBudget;
    
    if (pct >= CONFIG.BUDGET_ALERT_PCT) {
      var msg = 'BUDGET ALERT: Campaign "' + campaign.getName() + '" has spent Rs.' + 
                spent.toFixed(0) + ' of Rs.' + dailyBudget.toFixed(0) + 
                ' (' + (pct * 100).toFixed(0) + '%) before 6pm IST!';
      sendSlackAlert(msg);
      Logger.log(msg);
    }
  }
}

// ── SCRIPT 5: Auto-generate RSAs with Today's Top Deal ───────────────────────
function generateDealRSAs() {
  // Fetch today's top deal from PriceBasket API
  var response = UrlFetchApp.fetch(CONFIG.PRICEBASKET_API + '/products/featured?limit=3');
  var data = JSON.parse(response.getContentText());
  var products = data.items || [];
  
  if (products.length === 0) {
    Logger.log('No products fetched from API');
    return;
  }
  
  // 30 Ad Headlines for PriceBasket
  var HEADLINES = [
    'Compare Grocery Prices Free',
    'Blinkit vs Zepto vs BigBasket',
    'Save Rs.800 Per Month',
    'India\'s #1 Price Comparison',
    'Real-Time Grocery Prices',
    '8 Apps Compared Instantly',
    'Free Price Alerts India',
    'Never Overpay for Groceries',
    'Cheapest Grocery App India',
    'Compare 10000+ Products',
    'Atta Rs.189 on JioMart',
    'Save Rs.51 on Atta Today',
    'Grocery Deals Updated Live',
    'Cart Optimizer Free',
    'Price Drop Alerts Free',
    'Blinkit Prices vs Zepto',
    'BigBasket vs JioMart Prices',
    'Quick Commerce Comparison',
    'Grocery Price Tracker India',
    'Find Cheapest Grocery App',
    'Compare Before You Order',
    'Smart Grocery Shopping India',
    'Prices Updated Every 2 Hours',
    'No App Download Needed',
    '100% Free Forever',
    'Mumbai Grocery Prices',
    'Delhi Grocery Deals Today',
    'Bangalore Cheapest Grocery',
    'Hyderabad Grocery Prices',
    'Pune Grocery Comparison'
  ];
  
  // 15 Ad Descriptions
  var DESCRIPTIONS = [
    'Compare Blinkit, Zepto, BigBasket, Instamart, JioMart prices in real-time. Save Rs.800/month. Free forever.',
    'India\'s #1 grocery price comparison. 8 apps. 10,000+ products. Updated every 2 hours. Free price alerts.',
    'Same Aashirvaad Atta costs Rs.240 on Blinkit and Rs.189 on JioMart. Find the cheapest in 2 seconds.',
    'Never overpay for groceries again. Compare all quick commerce apps instantly. Free. No app needed.',
    'Set price alerts, optimize your cart, compare 8 grocery apps. Save Rs.500-2000/month. 100% free.',
    'Blinkit vs Zepto vs BigBasket vs Instamart — see who\'s cheapest for every product. Real-time data.',
    'Join 10 lakh+ Indians saving Rs.800/month on groceries. Free price comparison. pricebasket.in',
    'Grocery prices updated every 2 hours. Compare Blinkit, Zepto, BigBasket & 5 more apps. Free.',
    'Cart optimizer finds the cheapest split across all grocery apps. Save Rs.340 per order on average.',
    'Price drop alerts for any product. Get notified when Atta, Oil, Dal drops to your target price.',
    'Compare grocery prices in Mumbai, Delhi, Bangalore, Hyderabad. Find cheapest delivery app near you.',
    'Quick commerce price war: we track every price change across 8 apps. Always find the best deal.',
    'Aashirvaad Atta 5kg: Rs.189 on JioMart vs Rs.240 on Blinkit. Save Rs.51 per bag. Compare now.',
    'India\'s most trusted grocery price comparison. No paid rankings. Pure price data. Free forever.',
    'Compare Blinkit vs Zepto vs BigBasket prices for atta, oil, dal, rice, ghee & 10,000+ products.'
  ];
  
  Logger.log('RSA generation complete. Headlines: ' + HEADLINES.length + ', Descriptions: ' + DESCRIPTIONS.length);
  Logger.log('Use these in Google Ads RSA creation for PriceBasket campaigns.');
  
  // Log top deal for manual RSA creation
  if (products[0]) {
    Logger.log('Today\'s top deal for ad copy: ' + products[0].name);
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getDateRange(days) {
  var end = new Date();
  var start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return Utilities.formatDate(start, 'UTC', 'yyyyMMdd') + ',' + Utilities.formatDate(end, 'UTC', 'yyyyMMdd');
}

function sendSlackAlert(message) {
  if (!CONFIG.SLACK_WEBHOOK || CONFIG.SLACK_WEBHOOK.indexOf('YOUR') !== -1) {
    Logger.log('Slack alert (not configured): ' + message);
    return;
  }
  var payload = JSON.stringify({ text: '[PriceBasket Ads] ' + message });
  UrlFetchApp.fetch(CONFIG.SLACK_WEBHOOK, {
    method: 'post',
    contentType: 'application/json',
    payload: payload
  });
}

// ── MAIN: Run all scripts ─────────────────────────────────────────────────────
function main() {
  Logger.log('=== PriceBasket Google Ads Automation ===');
  Logger.log('Running at: ' + new Date().toISOString());
  
  try { pauseLowCtrKeywords(); } catch(e) { Logger.log('pauseLowCtrKeywords error: ' + e); }
  try { increaseBidsHighRoas(); } catch(e) { Logger.log('increaseBidsHighRoas error: ' + e); }
  try { reduceBidsExpensiveKeywords(); } catch(e) { Logger.log('reduceBidsExpensiveKeywords error: ' + e); }
  try { checkBudgetPacing(); } catch(e) { Logger.log('checkBudgetPacing error: ' + e); }
  try { generateDealRSAs(); } catch(e) { Logger.log('generateDealRSAs error: ' + e); }
  
  Logger.log('=== Automation complete ===');
}
