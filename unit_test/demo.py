import os
from unit_test import UnitTest

# %% Set up paths 
scansage_module = "../ScanSage"
verbose = 2
test_data = "./data/EasyOcrUnitTestPackage.pickle"
image_data_dir = "../examples"

# %% Initialize UnitTest
unit_test = UnitTest(scansage_module, 
                     test_data,
                     image_data_dir
                     )
# %% Run UnitTest at verbosity level 2
unit_test.do_test(verbose = 2)