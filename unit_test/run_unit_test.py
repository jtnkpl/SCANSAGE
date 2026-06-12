
import argparse
from unit_test import UnitTest 

# %%
def main(args):

    unit_test = UnitTest(args.scansage, args.test_data, args.image_data_dir, args.verbose)
    unit_test.do_test(args.verbose)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Script to run ScanSage unit test.",
                                     formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument("--scansage", help="Directory of ScanSage to test.")
    parser.add_argument("-t", "--test_data", default="./data/EasyOcrUnitTestPackage.pickle", help="Path to test data.")
    parser.add_argument("-d", "--image_data_dir", default="../examples", help="Path to directory that contains ScanSage example images.")
    parser.add_argument("-v", "--verbose", default=0, type = int, help="Verbosity level of report.")
    args = parser.parse_args()
    main(args)
