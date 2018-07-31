# Change Log
All notable changes to the "husarion" extension for VSCode and the corresponding libraries ([hFramework](https://github.com/husarion/hFramework), [hSensors](https://github.com/husarion/hSensors), [modules](https://github.com/husarion/modules)) will be documented in this file.

## [Unreleased]
### Husarion extension for VSCode
- Changelog for Husarion extension is now visible in VSCode

## [1.5.11] - 2018-07-30
### hFramework
- Added enum for selecting IMU type
- Moved sensors reading to separate tasks 

## [1.5.10] - 2018-07-25
### hFramework
- Added ROSbot support class for odometry, velocity command, battery, laser and infrared range sensors and IMU
- Added method for switching the 5V rail for hExt and hSensors
- Added new examples
- Fixed typos in hMotor braking modes
- small fixes
### hSensors, modules
- Added new examples

## [1.5.9] - 2018-05-21
### Husarion extension for VSCode
- Added more instruction how to use Husarion extension in "Details" section.

## [1.5.8] - 2018-05-14
### hFramework
- Added description for getTaskList(), getStats() in hSystem class
- Added build improvements to ESP32 port
- Updated esp-idf version
- Fix: swapped pins in hMotA and hMotB electrical interfaces
- Fixed bugs in I2C interface (mostly with rxDelay in I2C rw function)

## [1.5.7] - 2018-01-10
### hFramework
- Fixed Arduino library compilation errors
- Fixed getRefTime() method (added critical section)

## [1.5.6] - 2017-12-11
### hFramework
- Added Arduino support for hFramework
- Fixed default baudrate for hSerial

## [1.5.5] - 2017-10-19
### hFramework
- getRefTime() now returns 64-bit value instead of 32-bit
### Husarion extension for VSCode
- Fix: The custom HFRAMEWORK_DIR is not being overrided on soft reload now.

## [1.5.2] - 2017-09-18
### Husarion extension for VSCode
- Implemented support for MacOS
- Added status bar icons

## [1.4.8] - 2017-08-30
### hFramework
- Added Wi-Fi scanning for Linux
- Updated examples and fixed errors
- Updated API documentation
- Changed default RPi serial port baudrate to 500000
- Improved compatibility with VSCode
- Fixed malloc to be thread safe
- Fixed building for STM32
- Fixed spurious wakeup and getRefTime on Linux port
- Fixed delaySync() function in hSystem
- Fixed fault logs

## [1.4.6] - 2017-06-28
### hFramework
- Added MIT license note
- Updated IDF version for ESP32
- Fixed network scanning for ESP32

## [1.4.5] - 2017-04-27
### Husarion extension for VSCode
- Added CORE2mini to the list of boards
- Added dependencies check for Linux, MacOS
- Added Husarion logo

## [1.4.4] - 2017-02-21
- First official release of Husarion extension for VSCode
