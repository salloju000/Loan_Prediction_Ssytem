#!/usr/bin/env python3
"""
Training script for the Loan Prediction Model
Run this script to train the model with your dataset
"""

import argparse
import os
import sys
from model import LoanPredictionModel

def main():
    parser = argparse.ArgumentParser(description='Train the Loan Prediction Model')
    parser.add_argument('--data', '-d', 
                        required=True,
                        help='Path to the training dataset (CSV file)')
    parser.add_argument('--output', '-o',
                        default='trained_model.pkl',
                        help='Path to save the trained model (default: trained_model.pkl)')
    
    args = parser.parse_args()
    
    # Check if data file exists
    if not os.path.exists(args.data):
        print(f"Error: Data file '{args.data}' not found!")
        sys.exit(1)
    
    print("🚀 Starting model training...")
    print(f"📁 Data file: {args.data}")
    print(f"💾 Model will be saved to: {args.output}")
    print("-" * 50)
    
    # Initialize and train model
    try:
        model = LoanPredictionModel()
        model.model_path = args.output
        
        # Train the model
        result = model.train_model(args.data)
        
        print("\n" + "="*50)
        print("✅ Training completed successfully!")
        print(f"🏆 Best model: {result['Model']}")
        print(f"📊 Cross-validation AUC: {result['CV AUC Mean']:.4f}")
        print(f"🎯 Test AUC: {result['Test AUC']:.4f}")
        print(f"💾 Model saved to: {args.output}")
        print("="*50)
        
    except Exception as e:
        print(f"❌ Error during training: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()