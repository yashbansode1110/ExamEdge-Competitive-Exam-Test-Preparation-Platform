import re

with open('frontend/src/pages/AdminQuestionsPage.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Remove AI State
ai_state_pattern = re.compile(r'  // -------------------------\n  // AI Generator \(new\)\n  // -------------------------.*?function onDeleteAiPreviewQuestion\(idx\) \{\n    setAiPreviewQuestions\(\(prev\) => prev.filter\(\(_q, i\) => i !== idx\)\);\n  \}\n\n', re.DOTALL)
text = ai_state_pattern.sub('', text)

# 2. Tabs
text = text.replace(
'''      <div className="flex flex-wrap gap-3">
        <Button type="button" variant={mode === "manual" ? "primary" : "outline"} onClick={() => setMode("manual")}>
          Manual Entry
        </Button>
        <Button type="button" variant={mode === "ai" ? "primary" : "outline"} onClick={() => setMode("ai")}>
          Generate via AI
        </Button>
        <Button type="button" variant={mode === "upload" ? "primary" : "outline"} onClick={() => setMode("upload")}>
          Upload Questions
        </Button>
      </div>''',
'''      <div className="flex bg-white rounded-xl shadow-sm p-1 gap-1 border border-secondary-100 max-w-fit mb-6">
        <button type="button" className={`px-6 py-2.5 text-sm rounded-lg font-medium transition-all ${mode === "manual" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-50"}`} onClick={() => setMode("manual")}>
          Manual Entry
        </button>
        <button type="button" className={`px-6 py-2.5 text-sm rounded-lg font-medium transition-all ${mode === "upload" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-50"}`} onClick={() => setMode("upload")}>
          Upload Questions
        </button>
      </div>'''
)

# 3. Mode AI condition at bottom
# The code currently does: 
# {mode === "upload" ? ( ... ) : null}
# {mode === "manual" ? ( ... ) : ( ... ai part ... )}
# We need to change the last part to just `null`

# Let's find: `) : (\n        <Card>\n          <CardBody className="p-6">\n            <h2 className="text-xl font-bold text-secondary-900 mb-1">AI Question Generator</h2>`
# and everything down to `</Card>\n      )}`
ai_form_pattern = re.compile(r'      \) : \(\n        <Card>\n          <CardBody className="p-6">\n            <h2 className="text-xl font-bold text-secondary-900 mb-1">AI Question Generator</h2>.*?\n        </Card>\n      \)', re.DOTALL)
text = ai_form_pattern.sub('      ) : null', text)

# 4. Replace Card styling
text = text.replace(
    '<Card>\n          <CardBody className="p-6">', 
    '<div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-8 mb-6">\n<div className="max-w-4xl mx-auto">'
).replace('</CardBody>\n        </Card>', '</div>\n        </div>')

# 5. Make Upload file centered and better
upload_old = '''            <div className="space-y-3">
              <label className="block text-sm font-medium text-secondary-900">
                Choose file (.csv or .json)
                <input
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="mt-1 block w-full text-sm text-secondary-700"
                  onChange={onUploadFileChosen}
                />
              </label>'''

upload_new = '''            <div className="space-y-6">
              <div className="border-2 border-dashed border-secondary-300 rounded-xl p-10 flex flex-col items-center justify-center bg-secondary-50 hover:bg-secondary-100 transition-colors cursor-pointer relative">
                <div className="text-4xl mb-3">📁</div>
                <div className="text-secondary-900 font-medium mb-1">Upload CSV or JSON file</div>
                <div className="text-xs text-secondary-500 max-w-sm text-center">Drag and drop your file here or click to browse</div>
                <input
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={onUploadFileChosen}
                />
                {uploadFile && <div className="mt-4 text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{uploadFile.name}</div>}
              </div>'''

text = text.replace(upload_old, upload_new)

# spacing gap-4
text = text.replace('className="grid grid-cols-1 md:grid-cols-2 gap-3"', 'className="grid grid-cols-1 md:grid-cols-2 gap-6"')
text = text.replace('className="grid grid-cols-1 md:grid-cols-2 gap-2"', 'className="grid grid-cols-1 md:grid-cols-2 gap-4"')
text = text.replace('space-y-3', 'space-y-5')
text = text.replace('space-y-4', 'space-y-6')
text = text.replace('className="w-full mt-1"', 'className="block w-full mt-2 rounded-lg border-secondary-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"')
text = text.replace('min-h-[140px]"', 'min-h-[140px] block w-full mt-2 rounded-lg border-secondary-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"')

with open('frontend/src/pages/AdminQuestionsPage.jsx', 'w', encoding='utf-8') as f:
    f.write(text)


print("AdminQuestionsPage.jsx refactored successfully")

with open('frontend/src/pages/AdminTestsPage.jsx', 'r', encoding='utf-8') as f:
    tests_text = f.read()

# Refactor test creation UI
# Make cards
tests_text = tests_text.replace(
    '<Card>\n        <CardBody className="p-6">',
    '<div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-8 mb-6">'
).replace(
    '</CardBody>\n      </Card>',
    '</div>'
)

# Admin tests grids
tests_text = tests_text.replace('className="grid grid-cols-1 md:grid-cols-2 gap-3"', 'className="grid grid-cols-1 md:grid-cols-3 gap-6"')
tests_text = tests_text.replace('className="grid grid-cols-1 md:grid-cols-3 gap-3"', 'className="grid grid-cols-1 md:grid-cols-3 gap-6"')

# Test creation UI - inputs
tests_text = tests_text.replace('className="w-full mt-1"', 'className="block w-full mt-2 rounded-lg border-secondary-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"')

# Filter section
tests_text = tests_text.replace(
    '<h2 className="text-xl font-bold text-secondary-900 mb-1">Smart filter test</h2>',
    '<h2 className="text-2xl font-bold text-secondary-900 mb-2">Smart Filter Test Generator</h2>'
)
tests_text = tests_text.replace(
    '<h2 className="text-xl font-bold text-secondary-900 mb-1">Create Test</h2>',
    '<h2 className="text-2xl font-bold text-secondary-900 mb-2">Test Configuration</h2>'
)

# Test list items
tests_text = tests_text.replace(
    'className="flex items-center justify-between gap-3 rounded-md border border-secondary-200 p-3"',
    'className="flex items-center justify-between gap-4 rounded-xl border border-secondary-200 p-5 bg-secondary-50 hover:bg-white hover:shadow-md transition-all"'
)


with open('frontend/src/pages/AdminTestsPage.jsx', 'w', encoding='utf-8') as f:
    f.write(tests_text)

print("AdminTestsPage.jsx refactored successfully")
