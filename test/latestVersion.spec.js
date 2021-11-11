const latestVersion = require('../lib/latestVersion')

it('#latestVersion', () => {
    expect(latestVersion([])).toBe(null)

    expect(latestVersion([
        'foo',
        'bar'
    ])).toBe(null)

    expect(latestVersion([
        'foo',
        '3.5.1',
        '3.5.3',
        '3.5.4',
        '3.5.7',
        '3.6.0'
    ])).toBe('3.6.0')
})
