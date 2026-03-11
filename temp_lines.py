lines = open('app\\diagram-modeler.tsx').read().splitlines()
for i in range(1380, 1505):
    print(f'{i}: {lines[i-1]}')
