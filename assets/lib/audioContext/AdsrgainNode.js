var buffers = {};

function AdsrGainNode(ctx) {
  this.ctx = ctx;
  this.mode = 'exponentialRampToValueAtTime';
  this.options = {
    attackAmp: 0.1,
    decayAmp: 0.3,
    sustainAmp: 0.7,
    releaseAmp: 0.01,
    attackTime: 0.1,
    decayTime: 0.2,
    sustainTime: 1.0,
    releaseTime: 3.4,
    autoRelease: true
  };

  this.setOptions = options => this.options = Object.assign(this.options, options);

  this.gainNode;
  this.audioTime;

  this.getGainNode = audioTime => {
    this.gainNode = this.ctx.createGain();
    this.audioTime = audioTime;

    this.gainNode.gain.setValueAtTime(0.0000001, audioTime);
    this.gainNode.gain[this.mode](this.options.attackAmp, audioTime + this.options.attackTime);
    this.gainNode.gain[this.mode](this.options.decayAmp, audioTime + this.options.attackTime + this.options.decayTime);
    this.gainNode.gain[this.mode](this.options.sustainAmp, audioTime + this.options.attackTime + this.options.sustainTime);

    if (this.options.autoRelease) {
      this.gainNode.gain[this.mode](this.options.releaseAmp, audioTime + this.releaseTime());
      this.disconnect(audioTime + this.releaseTime());
    }

    return this.gainNode;
  };

  this.releaseNow = () => {
    this.gainNode.gain[this.mode](this.options.releaseAmp, this.ctx.currentTime + this.options.releaseTime);
    this.disconnect(this.options.releaseTime);
  };

  this.releaseTime = () => this.options.attackTime + this.options.decayTime + this.options.sustainTime + this.options.releaseTime;

  this.releaseTimeNow = () => this.ctx.currentTime + this.releaseTime();

  this.disconnect = disconnectTime => setTimeout(() => this.gainNode.disconnect(), disconnectTime * 1000);
}

function audioBufferInstrument(context, buffer) {
  this.context = context;
  this.buffer = buffer;
}

audioBufferInstrument.prototype.setup = function () {
  this.source = this.context.createBufferSource();
  this.source.buffer = this.buffer;
  this.source.connect(this.context.destination);
};

audioBufferInstrument.prototype.get = function () {
  this.source = this.context.createBufferSource();
  this.source.buffer = this.buffer;
  return this.source;
};

audioBufferInstrument.prototype.trigger = function (time) {
  this.setup();
  this.source.start(time);
};

function getFormValues(formElement) {
  const formParams = {};
  for (let i = 0; i < formElement.elements.length; i++) {
    const elem = formElement.elements[i];
    switch (elem.type) {
      case 'submit':
        break;
      case 'radio':
        elem.checked && (formParams[elem.name] = elem.value);
        break;
      case 'checkbox':
        elem.checked && (formParams[elem.name] = elem.value);
        break;
      case 'select-multiple':
        const selectValues = getSelectValues(elem);
        selectValues.length > 0 && (formParams[elem.name] = selectValues);
        break;
      default:
        elem.value !== undefined && (formParams[elem.name] = elem.value);
    }
  }
  return formParams;
}

function setFormValues(formElement, values) {
  for (let i = 0; i < formElement.elements.length; i++) {
    const elem = formElement.elements[i];
    switch (elem.type) {
      case 'submit':
        break;
      case 'radio':
        elem.checked = values[elem.name] === elem.value;
        break;
      case 'checkbox':
        elem.checked = values[elem.name] === elem.value;
        break;
      case 'select-multiple':
        values[elem.name] && setSelectValues(elem, values[elem.name]);
        break;
      default:
        values[elem.name] !== undefined && (elem.value = values[elem.name]);
    }
  }
}

function setSelectValues(selectElem, values) {
  for (let i = 0; i < selectElem.options.length; i++) {
    selectElem.options[i].selected = values.indexOf(selectElem.options[i].value) > -1;
  }
}

function getSelectValues(select) {
  const result = [];
  if (select && select.options) {
    for (let i = 0; i < select.options.length; i++) {
      const opt = select.options[i];
      opt.selected && result.push(opt.value || opt.text);
    }
  }
  return result;
}

function getSetFormValues() {
  this.set = setFormValues;
  this.get = getFormValues;
}

function selectElement(appendToID, selectID, options, selected) {
  this.appendToID = appendToID;
  this.selectID = selectID;
  this.options = options;
  this.selected = selected;
  this.selectList;

  this.create = cb => {
    const appendToID = document.getElementById(this.appendToID);
    this.selectList = document.createElement('select');
    this.selectList.id = this.selectID;
    appendToID.appendChild(this.selectList);
    this.update(selectID, this.options, this.selected);
  };

  this.onChange = cb => this.selectList.addEventListener('change', () => cb(this.selectList.value));

  this.update = (elem, options, selected) => {
    this.delete(elem);
    const selectList = document.getElementById(elem);
    for (const key in options) {
      const option = document.createElement('option');
      option.value = key;
      option.text = options[key];
      selectList.appendChild(option);
      key === selected && option.setAttribute('selected', true);
    }
  };

  this.getSelected = elem => {
    const selectList = document.getElementById(elem);
    for (let i = 0; i < selectList.options.length; i++) {
      const opt = selectList.options[i];
      if (opt.selected) return opt.value;
    }
    return false;
  };

  this.delete = elem => {
    const selectList = document.getElementById(elem);
    for (const option in selectList) {
      selectList.remove(option);
    }
  };

  this.getAsString = () => document.getElementById(this.appendToID).outerHTML;
}

function sampleLoader(context, url) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('get', url, true);
    request.responseType = 'arraybuffer';
    request.onload = () => request.status === 200 
      ? context.decodeAudioData(request.response, resolve) 
      : reject('tiny-sample-loader request failed');
    request.send();
  });
}

function getJSONPromise(url) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('get', url, true);
    request.responseType = 'text';
    request.onload = () => request.status === 200 
      ? resolve(JSON.parse(request.responseText)) 
      : reject('JSON could not be loaded ' + url);
    request.send();
  });
}

function loadSampleSet(ctx, dataUrl) {
  return new Promise((resolve, reject) => {
    getJSONPromise(dataUrl)
      .then(data => {
        const samplePromises = getSamplePromises(ctx, data);
        Promise.all(samplePromises)
          .then(() => resolve({ data, buffers }))
          .catch(error => console.log(error));
      })
      .catch(reject);
  });
}

function getSamplePromises(ctx, data) {
  const baseUrl = data.samples;
  const promises = [];
  data.filename = [];

  data.files.forEach(val => {
    const filename = val.replace(/\.[^/.]+$/, '');
    data.filename.push(filename);
    const remoteUrl = baseUrl + val;
    
    const loaderPromise = sampleLoader(ctx, remoteUrl);
    loaderPromise.then(buffer => buffers[filename] = new audioBufferInstrument(ctx, buffer));
    promises.push(loaderPromise);
  });

  return promises;
}

function trackerTable() {
  this.str = '';

  this.getTable = () => `<table id="tracker-table">${this.str}</table>`;

  this.setHeader = (numRows, data) => {
    this.str += `<tr class="tracker-row header">`;
    this.str += this.getCells('header', numRows, { header: true });
    this.str += `</tr>`;
  };

  this.setRows = (numRows, numCols, data) => {
    this.setHeader(numCols, data);
    for (let rowID = 0; rowID < numRows; rowID++) {
      this.str += `<tr class="tracker-row" data-id="${rowID}">`;
      this.str += data.title && (data.title[rowID].includes('baixo') || data.title[rowID].includes('cravo') || data.title[rowID].includes('violao')) 
        ? '' 
        : this.getCells(rowID, numCols, data);
      this.str += `</tr>`;
    }
  };

  let i = 0;
  this.getFirstCell = (rowID, data) => `<td class="tracker-first-cell" data-row-id="${rowID}">${data.title ? data.title[rowID] : ''}</td>`;

  this.getCells = (rowID, numRows, data) => {
    let str = this.getFirstCell(rowID, data);
    let cssClass = 'tracker-cell';
    rowID === 'header' && (cssClass = 'tracker-cell-header');

    for (let c = 0; c < numRows; c++) {
      const num = cssClass === 'tracker-cell' ? i : '';
      str += `<td class="${cssClass}" data-row-id="${rowID}" data-col-id="${c}">${num}`;
      i++;
      data.header && (str += c + 1);
      str += `</td>`;
    }
    return str;
  };
}