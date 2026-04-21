import re

with open('frontend/src/pages/AdminTestsPage.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Make Subject section into its own card-like boundary instead of just rounded-lg border
text = text.replace(
    '<div className="rounded-lg border border-secondary-200 p-4 space-y-3">',
    '<div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 space-y-4 my-6">'
)

# Move the labels "Subjects" and "Total Questions" to look more like a card header
text = text.replace(
    '<div className="text-sm font-semibold text-secondary-900">Subjects</div>\n                  <div className="text-xs text-secondary-600">Edit question counts directly.</div>',
    '<div className="text-xl font-bold text-secondary-900">Subject Distribution</div>\n                  <div className="text-sm text-secondary-600">Edit question counts directly.</div>'
)

# Add a wrapper for Marking Scheme
text = text.replace(
    '<div className="grid grid-cols-1 md:grid-cols-2 gap-3">',
    '<div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 space-y-4 my-6">\n              <div className="text-xl font-bold text-secondary-900 mb-4">Marking Scheme</div>\n              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">'
)

# Close the new div around marking scheme... wait, the original grid-cols-1 md:grid-cols-2 gap-3 ends before details
text = text.replace(
    '''              </div>\n            </div>\n\n            <details''',
    '''              </div>\n            </div>\n            </div>\n\n            <details'''
)

with open('frontend/src/pages/AdminTestsPage.jsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("AdminTestsPage sections split successful")
