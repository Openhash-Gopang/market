with open('webapp.html', encoding='utf-8') as f:
    lines = f.readlines()

# 1624~1632행 (0-indexed: 1623~1631) PROFILE_DONE_ACK 대기 제거
# PDV 보고 후 market 자동 닫힘 추가 (1649행 이후, 0-indexed: 1648)
print('1624행:', repr(lines[1623]))
print('1632행:', repr(lines[1631]))
print('1649행:', repr(lines[1648]))

# PROFILE_DONE_ACK 블록 제거 (1623~1631, 총 9줄 → 빈 줄 1개로)
lines = lines[:1623] + ["\n"] + lines[1632:]

# PDV 보고 후 자동 닫힘 추가 — 제거 후 행번호 재계산
# 원래 1649행은 now 1641행 (9줄 제거 후 +1빈줄 = 8줄 감소)
# PDV catch 다음 줄 찾기
for i, line in enumerate(lines):
    if '}).catch(err => console.warn' in line and 'PDV' in line:
        print(f'PDV catch 위치: {i+1}행')
        lines.insert(i+1, "          console.log('[Market] PDV 보고 완료 → market 탭 닫힘');\n")
        lines.insert(i+2, "          setTimeout(() => window.close(), 500);\n")
        break

with open('webapp.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('완료')