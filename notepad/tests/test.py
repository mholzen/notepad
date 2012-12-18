#!/opt/local/Library/Frameworks/Python.framework/Versions/2.7/Resources/Python.app/Contents/MacOS/Python

from sys import argv
from os.path import basename
from findup import findup
from subprocess import call

# .../test-foo.html -> open .../tests/test-foo.html
# .../test-foo.js   -> open .../tests/test-foo.html
# .../foo.js        -> open .../tests/test-foo.html

def replaceSuffix(file,newSuffix):
    parts = file.partition('.')
    return parts[0] + parts[1] + newSuffix

def findTestFromSource(source):
    name=basename(source)
    if name.startswith('test-'):
        if name.endswith('.html'):
            return name
        return replaceSuffix(name,'html')

    testDirectory = findup('tests', source)[0]
    return testDirectory + '/' + 'test-' + replaceSuffix(name,'html')

class Test:
    def __init__(self,file):
        self.file = file

    def execute(self):
        call(["open", "-a", "/Applications/Google Chrome.app", self.file])


if __name__ == '__main__':    
    file = argv[1]
    test = Test(findTestFromSource(file))
    test.execute()

