const path = require('path');
const fs = require('fs');

const exist = (dir) => {
    try {
        fs.accessSync(dir, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK);
        return true;
    } catch (e) {
        return false;
    }
};

const mkdirp = (dir) => {
    const dirname = path.relative('.', path.normalize(dir)).split(path.sep).filter(p => !!p);
    dirname.forEach((_d, idx) => {
        const pathBuilder = dirname.slice(0, idx + 1).join(path.sep);
        if (!exist(pathBuilder)) {
            fs.mkdirSync(pathBuilder);
        }
    });
};

const deleteFile = (dir, file) => {
    try {
        var location = path.normalize(path.join(__dirname, '..' , '..', dir, file));
        if(exist(location)){
            fs.unlinkSync(location);
        }        
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
};

module.exports = {exist, mkdirp, deleteFile};