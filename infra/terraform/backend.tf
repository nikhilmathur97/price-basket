terraform {
  backend "s3" {
    bucket  = "pricebasket-terraform-state"
    key     = "terraform.tfstate" # overridden per environment
    region  = "ap-south-1"
    encrypt = true
  }
}
