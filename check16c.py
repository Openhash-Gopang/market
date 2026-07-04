with open(r'C:\Users\주피터\Downloads\market\webapp.html', 'r', encoding='utf-8-sig') as f:
    content = f.read()

with open(r'C:\Users\주피터\Downloads\market\old16.txt', 'r', encoding='utf-8-sig') as f:
    old = f.read().rstrip('\n')

print('FOUND:', old in content)
print('OLD START:', repr(old[:50]))
