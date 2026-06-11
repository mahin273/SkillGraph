import os
import sys
import subprocess

def run_tests():
    # Set PYO3 environment variable in case they want to compile/install things on Python 3.14+
    os.environ["PYO3_USE_ABI3_FORWARD_COMPATIBILITY"] = "1"
    
    # Check if we are running in a virtual environment
    if not (sys.prefix != sys.base_prefix or "VIRTUAL_ENV" in os.environ):
        print("Warning: You are not running inside a Python virtual environment. It is highly recommended to run tests inside a venv or Docker container.")
        
    print("Running pytest...")
    try:
        # Check if pytest is installed
        import pytest
    except ImportError:
        print("Error: pytest is not installed. Please run: pip install pytest")
        sys.exit(1)
        
    # Execute pytest
    result = subprocess.run([sys.executable, "-m", "pytest", "tests"], capture_output=False)
    sys.exit(result.returncode)

if __name__ == "__main__":
    run_tests()
