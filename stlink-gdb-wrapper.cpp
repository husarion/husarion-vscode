#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main(int argc, char** argv) {
    vector<string> args;

    for (int i=1; i < argc; i++)
        args.push_back(string(argv[i]));

    bool enableFlasher = getenv("GDBWRAPPER_FLASH") != NULL;

}
