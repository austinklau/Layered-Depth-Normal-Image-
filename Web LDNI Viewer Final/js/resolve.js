
//小端读法
DataView.prototype.getBigUint64M = function () {
    return handleGetUint.call(this, 64);

}

DataView.prototype.getUint32M = function () {
    return handleGetUint.call(this, 32);


}
DataView.prototype.getUint8M = function () {
    const result = this.getUint8(this.offset);
    this.offset += 1;
    return result;
}
DataView.prototype.getUint16M = function () {

    return handleGetUint.call(this, 16);
}

function handleGetUint(num) {
    let n = num / 8;
    const result = Array.apply(null, Array(n)).map(_ => this.getUint8M()).map(n => {
        let num = n.toString(16);
        num = num.length > 1 ? num : '0' + num;
        return num
    }).reduce((pre, cur) => {
        return cur + pre;
    });
    return parseInt(result, 16);
}
function resolveLdni(originData) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(originData);

        reader.onload = (e) => {
            const data = e.target.result
            const v = new DataView(data);
            v.offset = 0;
            const version = v.getUint8M();
            const extraSpace = v.getBigUint64M();

            const params = [];
            for (let i = 0; i < 6; i++) {
                params.push(v.getUint16M())
            }
            const depth = params[2], width = params[0], height = params[1];
            const coords = [];
            for (let i = 0; i < 3; i++) {
                coords.push(v.getBigUint64M())
            }
            const unSize = v.getUint32M()

            const size = v.getUint32M()
            const compressed = new Uint8Array(size);

            for (let i = 0; i < size; i++) {
                compressed[i] = v.getUint8M()
            }



            const buffer = pako.inflate(compressed, { to: 'arraybuffer' }).buffer


            const view = new DataView(buffer);
            view.offset = 0;
            const columns = []
            for (let i = 0; i < width * height; i++) {
                let numCols = view.getUint32M();
                let arr = []
                for (let j = 0; j < numCols; j++) {
                    let startEnd = [];
                    for (let k = 0; k < 2; k++) {
                        startEnd.push(view.getUint16M());
                    }
                    arr.push(startEnd);
                }
                columns.push(arr);
            }

            let arr;
            const ve4dList = [];
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    arr = columns[x + y * width];
                    if (arr) {
                        for (let item of arr) {
                            let delta = item[1] - item[0];
                            let column = { x: x, y: y, z: (item[0] + delta / 2) * 2 / 3, w: delta * 2 / 3 };

                            ve4dList.push(column);
                        }
                    }
                }
            }


            let str = 'BEGIN_0\n';
            ve4dList.forEach(p => {
                str += p.x + ' ' + p.y + ' ' + p.z + ' ' + p.w + '\n'
            });
            str += 'END_0';
            resolve(str);
        }
    })

}

window.resolveLdni = resolveLdni;