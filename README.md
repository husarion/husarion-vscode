# Husarion VSCode Extension

## Features

This extension makes it easy to develop apps for Husarion devices using VSCode.

## Requirements

On Windows, all dependencies will be downloaded automatically.

On Linux, this extension requires you to install CORE2 toolchain.

* On Ubuntu/Debian: `sudo apt-get install gcc-arm-none-eabi cmake libusb-1.0-0 g++ ninja-build`
* On Arch install gcc-arm-none-eabi-bin, cmake, ninja-build and libusb..
* If your distribution doesn’t have compiler package for arm-none-eabi architecture, install the binary package from https://launchpad.net/gcc-arm-embedded

## Using the extension

To create new project, select empty folder, press Ctrl-Shift-P, type “create husarion project" and press enter.

More documentation is available at http://docs.husarion.com
