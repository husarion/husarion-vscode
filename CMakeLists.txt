cmake_minimum_required(VERSION 2.6)
get_filename_component(CURRENT_DIR ${CMAKE_CURRENT_LIST_FILE} PATH) # for cmake before 2.8.3

project(vscode_support C CXX ASM)

include(${WORKSPACE_PATH}/hcommon/ToolCommon.cmake)

add_executable(stlink-gdb-wrapper stlink-gdb-wrapper.cpp)
