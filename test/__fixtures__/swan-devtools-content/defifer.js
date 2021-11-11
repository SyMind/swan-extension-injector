const swanConfig = {
    startPage: 'path/to/page',
    contentScripts: {
        js: [],
        runAt: 'document_start'
    },
    background: {
        scripts: ['path/to/script']
    },
    origin: 'path/to/extension',
    name: 'swan swan extension',
    id: 'swan_swan_extension',
    exposeExperimentalAPIs: true
};

const extensionsArr = [];

extensionsArr.push(swanConfig);
