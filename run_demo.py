import ScanSage

print("Importing ScanSage succeeded!")

# Initialize Reader with GPU=False for CPU execution
print("Initializing ScanSage Reader...")
reader = ScanSage.Reader(['en'], gpu=False)

# Perform OCR
print("Running OCR on examples/english.png...")
result = reader.readtext('examples/english.png', detail=0)

print("\n--- OCR Detection Result ---")
print(result)
