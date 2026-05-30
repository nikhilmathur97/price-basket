import 'package:flutter/material.dart';

class AppTheme {
  // ── Brand Colors ──────────────────────────────────────────────────────────
  static const Color brandOrange = Color(0xFFFC5A01);
  static const Color brandOrangeDark = Color(0xFFea580c);
  static const Color brandOrangeLight = Color(0xFFFF7A2F);

  // ── Platform Colors ───────────────────────────────────────────────────────
  static const Color blinkitGreen = Color(0xFF0C831F);
  static const Color zeptoPurple = Color(0xFF8025FB);
  static const Color instamartOrange = Color(0xFFFC8019);
  static const Color bigbasketGreen = Color(0xFF84C225);
  static const Color flipkartBlue = Color(0xFF2874F0);
  static const Color amazonOrange = Color(0xFFFF9900);
  static const Color jiomartBlue = Color(0xFF0046D5);
  static const Color myntraPink = Color(0xFFFF3F6C);
  static const Color nykaaPink = Color(0xFFFC2779);

  // ── Neutral Colors ────────────────────────────────────────────────────────
  static const Color background = Color(0xFFF5F5F5);
  static const Color cardBackground = Color(0xFFFFFFFF);
  static const Color textPrimary = Color(0xFF171717);
  static const Color textSecondary = Color(0xFF737373);
  static const Color border = Color(0xFFF0F0F0);
  static const Color divider = Color(0xFFE5E5E5);

  // ── Light Theme ───────────────────────────────────────────────────────────
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: brandOrange,
        primary: brandOrange,
        secondary: brandOrangeDark,
        surface: cardBackground,
        background: background,
      ),
      scaffoldBackgroundColor: background,
      appBarTheme: const AppBarTheme(
        backgroundColor: cardBackground,
        foregroundColor: textPrimary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: cardBackground,
        selectedItemColor: brandOrange,
        unselectedItemColor: textSecondary,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w400,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: brandOrange,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: textSecondary,
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
      fontFamily: 'Roboto',
    );
  }
}
