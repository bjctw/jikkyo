/* global Kefir */
(() => {
  "use strict";

  const win = require("nw.gui").Window.get();
  const doc = document.currentScript.ownerDocument;

  const cursors = [
    ["ew-resize", ["w", "e"]],
    ["ns-resize", ["n", "s"]],
    ["nwse-resize", ["nw", "se"]],
    ["nesw-resize", ["ne", "sw"]]
  ];

  function getCursorName(id) {
    let name = null;
    cursors.some(c => {
      if (c[1].indexOf(id) >= 0) {
        name = c[0];
        return true;
      }
      return false;
    });
    return name;
  }

  const resizer = class extends HTMLElement {

    createdCallback() {
      const root = this.createShadowRoot();
      const template = doc.querySelector("template");
      root.appendChild(document.importNode(template.content, true));

      const indicator = root.getElementById("indicator");

      let maximized = false;
      win.on("maximize", (() => {
        this.classList.add("maximized");
        maximized = true;
      }).bind(this));
      win.on("unmaximize", (() => {
        this.classList.remove("maximized");
        maximized = false;
      }).bind(this));

      [
        ["nw", "n", "ne"],
        ["w", null, "e"],
        ["sw", "s", "se"]
      ]
      .forEach((el, ver) => el.forEach((el2, hor) => {
        if (!el2) return;

        Kefir.fromEvents(root.getElementById(el2), "mousedown")
        .filter(() => !maximized)
        .map(e => {
          e.preventDefault();
          e.stopPropagation();
          return e;
        })
        .flatMap(() =>
          Kefir.fromEvents(window, "mousemove")
          .takeUntilBy(Kefir.fromEvents(window, "mouseup"))
          .map(e => ({ type: "mousemove", x: e.screenX, y: e.screenY }))
          .merge(Kefir.constant({ type: "mousedown" }))
          .beforeEnd(() => ({ type: "mouseup" })))
        .onValue(v => {
          if (v.type === "mousedown") {
            window.document.body.style.cursor = getCursorName(el2);
            indicator.classList.add("on");
            return;
          }

          if (v.type === "mouseup") {
            window.document.body.style.cursor = null;
            indicator.classList.remove("on");
            return;
          }

          const winw = window.windowWrapper;
          let x = 0,
              y = 0,
              w = 0,
              h = 0;

          if (hor === 0) {
            x = v.x - winw.x;
            w = -x;
            if (winw.width + w < winw.minSize.width)
              x = w = 0;
          }

          if (ver === 0) {
            y = v.y - winw.y;
            h = -y;
            if (winw.height + h < winw.minSize.height)
              y = h = 0;
          }

          if (hor === 2) w = v.x - winw.right;
          if (ver === 2) h = v.y - winw.bottom;

          if (x || y) winw.moveBy(x, y);
          if (w || h) winw.resizeBy(w, h);
        });

      }));
    }

  };

  window.jikkyo.Resizer = document.registerElement("jikkyo-resizer", {
    prototype: resizer.prototype
  });

})();
