#!/usr/bin/env python3
"""
Setup script for Loan Prediction System
"""

import os
import subprocess
import sys
from pathlib import Path

def create_virtual_environment():
    """Create a virtual environment for the project"""
    print("🐍 Creating virtual environment...")
    try:
        subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)
        print("✅ Virtual environment created successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error creating virtual environment: {e}")
        return False

def get_activate_command():
    """Get the appropriate activation command for the OS"""
    if sys.platform.startswith('win'):
        return r"venv\Scripts\activate"
    else:
        return "source venv/bin/activate"

def install_requirements():
    """Install required packages"""
    print("📦 Installing requirements...")
    
    # Determine pip path based on OS
    if sys.platform.startswith('win'):
        pip_path = r"venv\Scripts\pip"
    else:
        pip_path = "venv/bin/pip"
    
    try:
        subprocess.run([pip_path, "install", "-r", "requirements.txt"], check=True)
        print("✅ Requirements installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing requirements: {e}")
        return False

def create_directory_structure():
    """Create necessary directories"""
    print("📁 Creating directory structure...")
    
    directories = [
        "data",
        "notebooks",
        "src",
        ".vscode"
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"   Created: {directory}/")
    
    print("✅ Directory structure created!")

def create_sample_data_info():
    """Create info file for data directory"""
    data_info = """# Data Directory

Place your loan prediction dataset (CSV file) in this directory.

## Expected Dataset Format:
- Gender: Male/Female
- Married: Yes/No  
- Dependents: 0/1/2/3+
- Education: Graduate/Not Graduate
- Self_Employed: Yes/No
- ApplicantIncome: Numeric
- CoapplicantIncome: Numeric
- LoanAmount: Numeric (in thousands)
- Loan_Amount_Term: Numeric (in months)
- Credit_History: 1.0/0.0
- Loan_Status: Y/N (target variable)

## Usage:
```bash
python train_model.py --data data/your_dataset.csv
```
"""
    
    with open("data/README.md", "w") as f:
        f.write(data_info)

def create_launch_json():
    """Create VSCode launch configuration"""
    launch_config = """{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Python: Train Model",
            "type": "python",
            "request": "launch",
            "program": "train_model.py",
            "args": ["--data", "data/loan_data.csv"],
            "console": "integratedTerminal",
            "cwd": "${workspaceFolder}"
        },
        {
            "name": "Python: Run Streamlit App",
            "type": "python",
            "request": "launch",
            "module": "streamlit",
            "args": ["run", "app.py"],
            "console": "integratedTerminal",
            "cwd": "${workspaceFolder}"
        },
        {
            "name": "Python: Current File",
            "type": "python",
            "request": "launch",
            "program": "${file}",
            "console": "integratedTerminal",
            "cwd": "${workspaceFolder}"
        }
    ]
}"""
    
    with open(".vscode/launch.json", "w") as f:
        f.write(launch_config)

def main():
    """Main setup function"""
    print("🚀 Setting up Loan Prediction System...")
    print("=" * 50)
    
    # Create directory structure
    create_directory_structure()
    
    # Create virtual environment
    if not create_virtual_environment():
        print("❌ Setup failed at virtual environment creation")
        return False
    
    # Install requirements
    if not install_requirements():
        print("❌ Setup failed at requirements installation")
        return False
    
    # Create additional files
    create_sample_data_info()
    create_launch_json()
    
    print("\n" + "=" * 50)
    print("✅ Setup completed successfully!")
    print("\n📋 Next Steps:")
    print("1. Activate virtual environment:")
    print(f"   {get_activate_command()}")
    print("\n2. Place your dataset in the data/ folder")
    print("\n3. Train the model:")
    print("   python train_model.py --data data/your_dataset.csv")
    print("\n4. Run the Streamlit app:")
    print("   streamlit run app.py")
    print("\n5. Open VSCode and start coding!")
    print("   code .")
    print("=" * 50)

if __name__ == "__main__":
    main()