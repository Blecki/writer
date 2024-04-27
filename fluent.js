export function Fluent() {
    return {
        div: element_with_children("div"),
        file: file,
        button: button,
        input: input,
        select: select,
        raw_div: raw_div,
        text: text,
        textinput: textinput,
        h4: element_with_children("h4"),
        ul: element_with_children("ul"),
        li: element_with_children("li"),
        span: element_with_children("span")
    };
}

function add_hooks(element) {
    element.modify = (callback) => {
        callback(element);
        return element;
    };

    element.class = (class_name) => {
        element.className = class_name;
        return element;
    };

    element.grid = (rowstart, columnstart, rowend, columnend) => {
        element.style.gridArea = "" + rowstart + " / " + columnstart + " / " + rowend + " / " + columnend;
        return element;
    };

    element._style = (styles) => {
        for(var s in styles) {
            element.style[s] = styles[s];
        }
        return element;
    };

    element.handler = (type, func) => {
        element.addEventListener(type, func);
        return element;
    };

    return element;
}

function element_with_children(type) {
    return (...args) => {
        var r = document.createElement(type);
        for (var child of args) {
            if (child === undefined) continue;
            if (typeof child === 'string' || child instanceof String)
                r.appendChild(document.createTextNode(child));
            else
                r.appendChild(child);
        }
        return add_hooks(r);
    }
}

function text(t) {
    var r = document.createElement("span");
    r.innerText = t;
    return add_hooks(r);
}

function file(onchange) {
    var r = document.createElement("input");
    r.type = "file";
    if (onchange) r.onchange = onchange;
    return add_hooks(r);
}

function button(text, onclick) {
    var r = document.createElement("button");
    r.type = "button";
    if (onclick) r.onclick = onclick;
    r.innerText = text;
    return add_hooks(r);
}

function input(value) {
    var r = document.createElement('input');
    r.value = value;
    return add_hooks(r);
}

function select(list, value) {
    var r = document.createElement('select');
    for (var option of list) {
        var option_element = document.createElement('option');
        option_element.value = option;
        option_element.innerText = option;
        r.appendChild(option_element);
    }
    r.value = value;
    return add_hooks(r);
}

function raw_div(html) {
    var r = element_with_children("div")();
    r.innerHTML = html;
    return add_hooks(r);
}

function textinput(value) {
    var r = document.createElement("textarea");
    r.value = value;
    return add_hooks(r);
}