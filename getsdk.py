#!/usr/bin/env python3
# Updates the bundled SDK to correct version.
import json, subprocess, shutil
version = json.load(open('package.json'))['version']
sdk_url = 'https://files.husarion.com/sdk/HusarionSDK-%s.zip' % version
subprocess.check_call(['wget', sdk_url, '-Osdk/Husarion_SDK.zip'])
subprocess.check_call(['unzip', 'Husarion_SDK.zip'], chdir='sdk')
os.unlink('sdk/Husarion_SDK.zip')
shutil.rmtree('sdk/doc')
shutil.rmtree('sdk/examples')