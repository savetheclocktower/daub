/* global Daub */
window.Support = {
  setup () {
    if ( document.querySelector('ul#menu') ) {
      // Build the TOC.
      let h1s = Array.from( document.querySelectorAll('section[id] h1, h1[id]') );

      let lis = h1s.map(h1 => {
        let id = h1.getAttribute('id'), title = h1.innerText;
        if (!id) { id = h1.closest('section').getAttribute('id'); }

        return `<li><a href="#${id}">${title}</a></li>`;
      });

      document.querySelector('ul#menu').innerHTML = lis.join('\n');
    }
    
    let node = document.querySelector('*[data-daub-lang]');
    console.log('node:', node);
    let langs = (node.getAttribute('data-daub-lang') || '').split(',');
    
    window.h = new daub.Highlighter();

    langs.forEach(function (lang) {
      console.log('lang:', lang);
      console.log('daub:', daub, Object.keys(daub));
      if (daub[lang]) {
        console.log('adding:', lang);
        h.addGrammar(daub[lang]);
      }
    });
    
    // If there's a PRE element with a `data-only` attribute, highlight only
    // that element. Useful for debugging.
    if (document.querySelector('[data-only]')) {
      h.addElement( document.querySelector('[data-only]') );
    } else {
      h.addElement(document.body);
    }
    
    let start, end;
    start = performance.now();
    if (performance && performance.mark) {
      performance.mark('daub-before');
    }
    h.highlight();
    if (performance && performance.mark) {
      performance.mark('daub-after');
      performance.measure('daub-before', 'daub-after');
    }
    end = performance.now();
    console.log('highlight time:', end - start, 'ms');
    

    // Keep the chosen section in view.
    let hash = window.location.hash;
    if (hash) {
      window.setTimeout(() => {
        document.querySelector(hash).scrollIntoView();
      }, 0);
    }
  }
};