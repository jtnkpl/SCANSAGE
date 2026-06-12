"""
End-to-End Multi-Lingual Optical Character Recognition (OCR) Solution
"""
from io import open
from setuptools import setup

with open('requirements.txt', encoding="utf-8-sig") as f:
    requirements = f.readlines()

def readme():
    with open('README.md', encoding="utf-8-sig") as f:
        README = f.read()
    return README

setup(
    name='ScanSage',
    packages=['ScanSage'],
    include_package_data=True,
    version='1.7.2',
    install_requires=requirements,
    entry_points={"console_scripts": ["ScanSage = ScanSage.cli:main"]},
    license='MIT',
    description='End-to-End Multi-Lingual Optical Character Recognition (OCR) Solution',
    long_description=readme(),
    long_description_content_type="text/markdown",

    keywords=['ocr optical character recognition deep learning neural network'],
    classifiers=[
        'Development Status :: 5 - Production/Stable'
    ],

)
