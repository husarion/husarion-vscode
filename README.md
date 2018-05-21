# Husarion VSCode Extension #

## Features ##

This extension allows you to develop apps for Husarion devices using VSCode.

## Requirements ##

On Windows, all dependencies will be downloaded automatically. All you have to do is:

    Download Zadig (http://zadig.akeo.ie/), connect CORE2 via micro USB cable and launch Zadig. Click [Options] -> [List All Devices], choose “FT230X Basic UART" from the drop-down list, select "WinUSB (v6.1.7600.16385)" driver and click “Replace Driver".

On Linux, this extension requires you to install CORE2 toolchain:

    On Ubuntu/Debian: sudo apt-get install gcc-arm-none-eabi cmake libusb-1.0-0 g++ ninja-build
    On Arch install gcc-arm-none-eabi-bin, cmake, ninja-build and libusb..
    If your distribution doesn’t have compiler package for arm-none-eabi architecture, install the binary package from https://launchpad.net/gcc-arm-embedded

On Mac, you have to fallow steps below:

    If you don't have brew installed, follow the instructions at https://brew.sh
    Install C++ cross-compiler - execute in the terminal:
    $ brew tap PX4/homebrew-px4
    $ brew update
    $ brew install gcc-arm-none-eabi-48
    Install CMake, Ninja and STLink:
    $ brew install cmake ninja stlink
    Download and install VS Code from https://code.visualstudio.com/
    Launch VS Code, press Ctrl-Shift-X, find "husarion" extension and click "Install". VS Code will ask you if you want to install also the dependencies - agree. Reload VSCode.


## Using the extension ##

To create new project, select empty folder, press Ctrl-Shift-P, type “create husarion project" and press enter.

To build project, press Ctrl+Shift-B.

To flash project on your device, press Ctrl+Shift+P, type "Flash project to CORE2" and press enter.

More documentation is available at https://husarion.com/tutorials/
