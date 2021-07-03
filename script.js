var editor = (function(options) {
  let editor = {
    imageBucket: {}
  };
  var f = fabric.Image.filters;

  editor.options = {
    canvasType: 'image',
    canvasContainer: 'canvasContainer',
    imageElement: 'mainImageElement',
    templateTextContainer: 'templateTextElements',
    templateImageContainer: 'templateImageElements',
    minFontSiz: 15,
    minFontSizeMessage: 'Text font is too small ',
    backgroundFileInput: 'background',
    textMaxLines: 2
  };
  editor.options = { ...editor.options, ...options };
  editor.canvasContainer = document.getElementById(
    editor.options.canvasContainer
  );
  editor.canvas = new fabric.Canvas(document.createElement('canvas'));

  editor.changeBackgroundFile = e => {
    var reader = new FileReader();
    reader.onload = function(event) {
      var imgObj = new Image();
      imgObj.src = event.target.result;

      imgObj.onload = function() {
        var image = new fabric.Image(imgObj);

        editor.canvas.setBackgroundImage(
          image,
          editor.canvas.renderAll.bind(editor.canvas),
          {
            scaleX: editor.canvas.width / image.width,
            scaleY: editor.canvas.height / image.height
          }
        );
        editor.update();
      };
    };
    reader.readAsDataURL(e.target.files[0]);
  };

  if (editor.options.backgroundFileInput) {
    document
      .getElementById(editor.options.backgroundFileInput)
      .addEventListener('change', e => {
        editor.changeBackgroundFile(e);
      });
  }

  editor.showError = (spanElement, message) => {
    if (message) {
      if (spanElement) spanElement.style.display = 'block';
    }
  };
  editor.removeError = spanElement => {
    if (spanElement) spanElement.style.display = 'none';
  };

  editor.showHideTextError = element => {
    let spanElement = document.getElementById('font_error_' + element.id);
    if (editor.options.minFontSiz > element.fontSize) {
      editor.showError(spanElement, editor.options.minFontSizeMessage);
    } else {
      editor.removeError(spanElement);
    }
  };

  editor.canvas.width = editor.options.width
    ? editor.options.width
    : editor.canvasContainer.clientWidth;
  editor.canvas.height = 400;

  editor.image = document.getElementById(editor.options.imageElement);
  editor.templateTextContainer = document.getElementById(
    editor.options.templateTextContainer
  );
  editor.templateImageContainer = document.getElementById(
    editor.options.templateImageContainer
  );

  editor.applyFilter = (obj, index, filter) => {
    obj.filters[index] = filter;
    obj.applyFilters();

    editor.update();
  };

  editor.applyFilterValue = (obj, index, prop, value) => {
    if (obj.filters[index]) {
      obj.filters[index][prop] = value;
      obj.applyFilters();
      editor.update();
    }
  };

  // debounce method to stop if same method calling again in wait time
  editor.debounce = (func, wait, immediate) => {
    var timeout;
    return function() {
      var context = this,
        args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  };
  editor.textFontBucket = {};
  // update text change on canvas/image from html
  editor.updateText = editor.debounce(element => {
    let selectedId = editor.canvas
      .getObjects()
      .find(item => item.id == element.id);
    let clonnedObject = editor.clonedCanvas
      .getObjects()
      .find(item => typeof item.id != 'undefined ' && item.id == element.id);
    if (
      selectedId &&
      (typeof editor.textFontBucket[selectedId.id] == 'undefined' ||
        editor.textFontBucket[selectedId.id].text.trim() !=
          element.value.trim())
    ) {
      selectedId.text = element.value;

      var txt = selectedId;
      // save last font size
      if (typeof editor.textFontBucket[selectedId.id] == 'undefined') {
        editor.textFontBucket[selectedId.id] = {
          fontSize: selectedId.fontSize,
          fixedWidth: selectedId.width,
          height: selectedId.height,
          width: selectedId.width,
          text: element.value
        };
      }

      if (selectedId.width > editor.textFontBucket[selectedId.id].fixedWidth) {
        selectedId.fontSize *=
          editor.textFontBucket[selectedId.id].fixedWidth /
          (selectedId.width + 1);
        selectedId.width = editor.textFontBucket[selectedId.id].fixedWidth;
      } else {
        selectedId.fontSize = clonnedObject
          ? clonnedObject.fontSize
          : editor.textFontBucket[selectedId.id].fontSize;
        editor.canvas.renderAll();
        if (selectedId.width > editor.textFontBucket[selectedId.id].width) {
          selectedId.fontSize *=
            editor.textFontBucket[txt.id].fixedWidth / (txt.width - 10);
          selectedId.width = editor.textFontBucket[selectedId.id].fixedWidth;
        }
      }
      while (selectedId.height > editor.textFontBucket[selectedId.id].height) {
        selectedId.set({ fontSize: selectedId.fontSize - 1 });
      }
      txt.set({ textAlign: 'justify-center' });

      function checkIntersection(obj) {
        let intersect = false;
        editor.canvas.getObjects().map(item => {
          if (
            item.id &&
            item.id.toLowerCase() == 'placeholder' &&
            obj.intersectsWithObject(item)
          ) {
            intersect = true;
          }
        });
        return intersect;
      }

      if (editor.options.minFontSiz) editor.showHideTextError(txt);

      if (checkIntersection(txt)) {
        console.log('Text might be overlapping with Placeholder');
      }
      if (txt.isPartiallyOnScreen()) {
        console.log('Out of image');
      }

      if (txt._textLines.length > editor.options.textMaxLines) {
        console.log('To many lines of text');
      }

      editor.update();
    } else {
      console.log('Text has no id or some imp attribute');
    }
  }, 200);

  // add single text box to container from canvas object
  editor.addTextBoxElement = (textbox, index) => {
    let wrapper = document.createElement('div');
    let element = document.createElement('textarea');
    let label = document.createElement('label');
    let placeholderErrorSpan = document.createElement('span');
    placeholderErrorSpan.id = 'font_error_' + textbox.id;
    placeholderErrorSpan.className = 'text-danger';
    placeholderErrorSpan.style.display = 'none';
    placeholderErrorSpan.textContent = editor.options.minFontSizeMessage;
    element.className = 'form-control';
    wrapper.className = 'md-3';
    label.className = 'form-label';
    element.addEventListener('keyup', e => {
      editor.updateText(e.target);
    });

    element.value = textbox.text;
    label.textContent = textbox.name ? textbox : 'Text ' + index;
    element.id = textbox.id;
    wrapper.appendChild(label);
    wrapper.appendChild(element);
    wrapper.appendChild(placeholderErrorSpan);

    editor.templateTextContainer.appendChild(wrapper);
  };
  editor.hideImagePlaceHolder = obj => {
    obj.visible = false;
    editor.update();
  };
  editor.clearPlaceHolder = id => {
    editor.canvas.remove(editor.imageBucket[id]);
  };

  // add single Image to container from canvas object
  editor.addImageElement = (textbox, index) => {
    let wrapper = document.createElement('div');
    let element = document.createElement('input');
    let label = document.createElement('label');
    let fontErrorSpan = document.createElement('span');
    fontErrorSpan.id = 'placeholder_' + textbox.id;

    element.type = 'file';
    element.className = 'form-control';
    wrapper.className = 'md-3';
    label.className = 'form-label';
    label.textContent = textbox.name ? textbox : 'Image ' + index;
    element.addEventListener('change', e => {
      if (e.target.files.length > 0) {
        let selectedImage = editor.canvas
          .getObjects()
          .find(
            item =>
              typeof item.id != 'undefined' &&
              item.id.toLowerCase() == e.target.id.toLowerCase()
          );
        if (selectedImage) {
          var reader = new FileReader();
          reader.onload = function(event) {
            var imgObj = new Image();
            imgObj.src = event.target.result;

            imgObj.onload = function() {
              var image = new fabric.Image(imgObj);
              image.set({
                angle: selectedImage.angle,
                padding: selectedImage.padding,
                cornersize: selectedImage.cornersize
              });

              image.scaleToHeight(selectedImage.height);
              image.scaleToWidth(selectedImage.width);
              image.set({
                left: selectedImage.left,
                top: selectedImage.top,
                scaleX: selectedImage.width / imgObj.width,
                scaleY: selectedImage.height / imgObj.height
              });

              if (selectedImage.blend) {
                editor.applyFilter(
                  selectedImage,
                  20,
                  new f.BlendImage({
                    image: image
                  })
                );
                editor.applyFilterValue(selectedImage, 20, 'mode', 'multiply');
              } else {
                editor.canvas.add(image);
                //editor.canvas.remove(selectedImage);
                editor.hideImagePlaceHolder(selectedImage);
              }
              editor.clearPlaceHolder(selectedImage.id);
              editor.imageBucket[selectedImage.id] = image;

              editor.update();
            };
          };
          reader.readAsDataURL(e.target.files[0]);
        }
      }
    });

    element.id = textbox.id;
    wrapper.appendChild(label);
    wrapper.appendChild(element);
    wrapper.appendChild(fontErrorSpan);

    editor.templateImageContainer.appendChild(wrapper);
  };

  //load input text box/textarea from tepmlate to html
  editor.loadInputs = objects => {
    try {
      let textIndex = 0;
      let imageIndex = 0;
      objects.map((item, index) => {
        if (item.type.toLowerCase() == 'i-text') {
          editor.addTextBoxElement(item, textIndex);
          textIndex++;
        }
        if (
          item.type.toLowerCase() == 'image' &&
          item.id.toLowerCase() != 'background'
        ) {
          editor.addImageElement(item, imageIndex);
          imageIndex++;
        }
      });
    } catch (e) {
      console.log('Error in textbox creation ', e);
    }
  };

  // debounced mehtod to
  editor.update = editor.debounce(() => {
    editor.canvas.renderAll();
    editor.image.src = editor.canvas.toDataURL('png');
  }, 500);

  editor.removeAllChildNodes = parent => {
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
  };
  // clear canvas when loading template required
  editor.clean = () => {
    editor.canvas.clear();
    editor.removeAllChildNodes(editor.templateTextContainer);
    editor.removeAllChildNodes(editor.templateImageContainer);
  };

  //loading new templates in canvas and elements in panel
  editor.loadTemplate = svg => {
    editor.clean();
    let width = editor.canvasContainer.clientWidth;
    let height = editor.canvasContainer.clientHeight;

    var ratio =
      editor.canvasContainer.clientWidth / editor.canvasContainer.clientHeight;

    if (width / height > ratio) {
      width = height * ratio;
    } else {
      height = width / ratio;
    }

    fabric.loadSVGFromString(svg, function(objects, options, elements) {
      // Resize in ratio
      editor.canvas.height = options.height;
      var scale = options.width / width;
      var zoom = editor.canvas.getZoom();
      zoom = zoom * scale;
      /// Resize in ratio
      objects = objects.map((item, index) => {
        item.id = item.id ? item.id : 'id' + index;

        return item;
      });

      objects = objects.map((item, index) => {
        item.setCoords();
        if (item.type == 'text') {
          item.set({
            textAlign: 'justfy-center',
            width: item.width * scale,
            height: item.width * scale,
            fixedWidth: item.width,
            fixedHeight: item.height
          });
          var element = elements[index];
          var childrens = [].slice.call(element.childNodes);
          if (childrens.length > 0) {
            var value = '';
            childrens.forEach(function(el, index, array) {
              if (el.nodeName == 'tspan') {
                value += el.childNodes[0].nodeValue;
              } else if (el.nodeName == '#text') {
                value += el.nodeValue;
              }

              if (index < childrens.length - 1) {
                value += '\n';
              }
            });

            value =
              item['text-transform'] == 'uppercase'
                ? value.toUpperCase()
                : value;

            var text = new fabric.IText(item.text, item.toObject());
            text.id = item.id;
            text.set({
              text: value,
              type: 'i-text',
              fixedWidth: item.width,
              fixedHeight: item.height,
              textAlign: 'center',
              lineHeight: 1
            });

            var patt1 = /\n/;
            if (text.text.search(patt1) != -1) {
              var left = 0;
              var _textAlign = item.get('textAnchor')
                ? item.get('textAnchor')
                : 'left';
              switch (_textAlign) {
                case 'center':
                  left = item.left + text.getScaledWidth() / 2;
                  break;
                case 'right':
                  left = item.left - text.getScaledWidth();
                  break;
                default:
                  left = item.left;
                  break;
              }

              text.set({
                left: left,
                //    textAlign: _textAlign
                textAlign: 'right',
                lineHeight: 1
              });
            } // check if \n exists
          } // check if there are multiple lines only thne add i-text

          editor.canvas.add(text).renderAll();
          return text;
        } else if (item.id.toLowerCase() == 'background') {
          editor.canvas.setBackgroundImage(
            item,
            editor.canvas.renderAll.bind(editor.canvas)
          );
          return item;
        } else {
          editor.canvas.add(item);
          return item;
        }
      });
      editor.loadInputs(objects);

      editor.update();
      editor.canvas.clone(clonedCanvas => {
        editor.clonedCanvas = clonedCanvas;
      });
    });
  };

  return editor;
})({
  canvasType: 'image',
  canvasContainer: 'canvasContainer',
  imageContainer: 'mainImageContainer',
  imageElement: 'mainImageElement',
  templateTextContainer: 'templateTextElements'
});

// editor.loadTemplate(template.toString());

// editor.loadTemplate(template2.toString());
editor.loadTemplate(template3.toString());
