// 获取DOM元素
const imageUpload = document.getElementById('imageUpload');
const textInput = document.getElementById('textInput');
const processButton = document.getElementById('processButton');
const resultCanvas = document.getElementById('resultCanvas');
const statusH5 = document.getElementById('status');
var originImgFile = null;

// 处理拖拽文件进入
imageUpload.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageUpload.classList.add('dragover');
});

imageUpload.addEventListener('dragleave', (e) => {
    e.preventDefault();
    imageUpload.classList.remove('dragover');
});

imageUpload.addEventListener('drop', (e) => {
    e.preventDefault();
    imageUpload.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
        originImgFile = file;
        statusH5.innerHTML = 'Status: File uploaded';
    }
});

// 处理粘贴文件进入（目前浏览器对粘贴文件的支持有限，这里只是一个示例，不一定在所有浏览器都能正常工作）
document.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            var newFile = new File([file], file.name, {type: file.type});
            if (file) {
                originImgFile = newFile;
                statusH5.innerHTML = 'Status: File uploaded';
            }
        }
    }
});

// 处理用户点击上传按钮
imageUpload.addEventListener('change', () => {
    if (imageUpload.files.length > 0) {
        originImgFile = imageUpload.files[0];
        statusH5.innerHTML = 'Status: File uploaded';
    }
});

processButton.addEventListener('click', async () => {
    // 获取用户上传的图片文件
    var file = null;
    if (originImgFile) {
        file = originImgFile;
        if (!file) {
            alert('请选择图片文件');
            return;
        }
    } else {
        file = imageUpload.files[0];
    }
    if (!file) {
        alert('请选择图片文件');
        return;
    }

    // 读取图片文件内容
    const imageObj = await new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                resolve(img);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    // 获取图片原始宽度和高度
    const canvas = document.createElement('canvas');
    canvas.width = imageObj.width;
    canvas.height = imageObj.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageObj, 0, 0);

    // 计算图片底部10%区域的高度
    const bottomHeight = Math.floor(canvas.height * 0.1);
    const bottomY = canvas.height - bottomHeight;

    // 裁剪出原始图片底部10%的图像并保存
    const bottomImageCanvas = document.createElement('canvas');
    bottomImageCanvas.width = canvas.width;
    bottomImageCanvas.height = bottomHeight;
    const bottomImageCtx = bottomImageCanvas.getContext('2d');
    bottomImageCtx.drawImage(canvas, 0, bottomY, canvas.width, bottomHeight, 0, 0, canvas.width, bottomHeight);

    // 获取用户输入的文本内容并按换行符拆分
    const textLines = textInput.value.split('\n');

    // 处理第一行文字直接绘制在原图片底部10%区域
    let fontSize = Math.floor(bottomHeight * 0.7);
    ctx.font = `${fontSize}px Arial`;
    const textWidth = ctx.measureText(textLines[0]).width;
    const firstTextX = (canvas.width - textWidth) / 2;
    const testY = canvas.height - bottomHeight / 8;
    // 获取第一行文字所在背景区域的平均亮度，判断文字颜色
    const firstBgColor = getAverageColor(bottomImageCtx, 0, 0, bottomImageCanvas.width, bottomImageCanvas.height);
    const textColor = getTextColor(firstBgColor);
    ctx.fillStyle = textColor;
    ctx.fillText(textLines[0], firstTextX, testY);

    // 处理后续每行文字，需要拼接原始图片底部10%区域并绘制文字
    for (let i = 1; i < textLines.length; i++) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height + bottomHeight;
        const tempCtx = tempCanvas.getContext('2d');

        // 先绘制原图片
        tempCtx.drawImage(canvas, 0, 0);

        // 拼接原始图片底部10%的图像
        for (let j = 0; j < i; j++) {
            tempCtx.drawImage(bottomImageCanvas, 0, 0, canvas.width, bottomHeight, 0, canvas.height + bottomHeight * j, canvas.width, bottomHeight);
        }

        // 重新计算文字大小（因为画布高度变化了，重新按比例估算合适字体大小）
        fontSize = Math.floor((tempCanvas.height - canvas.height) * 0.7);
        tempCtx.font = `${fontSize}px Arial`;
        const textWidth = tempCtx.measureText(textLines[i]).width;
        const textX = (tempCanvas.width - textWidth) / 2;
        const textY = (canvas.height + (tempCanvas.height - canvas.height)) - bottomHeight / 8;
        // 获取当前行文字所在背景区域的平均亮度，判断文字颜色
        tempCtx.fillStyle = textColor;
        tempCtx.fillText(textLines[i], textX, textY);

        canvas.width = tempCanvas.width;
        canvas.height = tempCanvas.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
    }

    // 将最终结果绘制到显示的canvas上
    resultCanvas.width = canvas.width;
    resultCanvas.height = canvas.height;
    const resultCtx = resultCanvas.getContext('2d');
    resultCtx.drawImage(canvas, 0, 0);

    // 辅助函数：获取指定区域的平均颜色（以RGB值计算平均）
    function getAverageColor(ctx, x, y, width, height) {
        const imageData = ctx.getImageData(x, y, width, height).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < imageData.length; i += 4) {
            r += imageData[i];
            g += imageData[i + 1];
            b += imageData[i + 2];
        }
        const pixelCount = imageData.length / 4;
        r = Math.floor(r / pixelCount);
        g = Math.floor(g / pixelCount);
        b = Math.floor(b / pixelCount);
        return `rgb(${r},${g},${b})`;
    }

    // 辅助函数：根据背景色的平均亮度判断文字颜色（简单以灰度值判断，可根据实际优化）
    function getTextColor(bgColor) {
        const match = bgColor.match(/rgb\((\d+),(\d+),(\d+)\)/);
        console.log(match);
        if (match) {
            const [r, g, b] = match.slice(1).map(Number);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            console.log(brightness);
            return brightness > 127 ? "black" : "white";
        }
        return "black";
    }
});

