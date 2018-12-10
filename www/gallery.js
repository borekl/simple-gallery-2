(function() {

var gallery;
var kbd = [];


/*==========================================================================*
  Keydown handler management.
 *==========================================================================*/

function kbd_handler_push(callback)
{
  kbd.push(callback);
  $(document).off('keydown').on('keydown', callback);
}

function kbd_handler_pop()
{
  $(document).off('keydown')
  kbd.pop();
  if(kbd.length) {
    $(document).on('keydown', kbd[kbd.length - 1]);
  }
}


/*==========================================================================*
  For given 'width' and 'pos' return in what band out of 'bands' the
  position is.
 *==========================================================================*/

function get_band(bands, width, pos)
{
  return Math.floor(pos / (width / bands));
}


/*==========================================================================*
  For given jQuery element and click event return navigation keyword:
  'prev', 'next', 'exit'. These are issue in response to the user clicking
  in the viewport: left third goes for 'prev', middle third is 'exit' and
  right third goes for 'next'.
 *==========================================================================*/

function click_action(jq_el, evt)
{
  var
    action,
    map = [ 'prev', 'exit', 'next' ] ;

  if(evt.type == 'click') {
    action = get_band(3, jq_el.width(), evt.clientX);
    return map[action];
  } else {
    return null;
  }
}


/*==========================================================================*
  Picture browser. It just displays one picture at maximum size and allows
  user to browse them with keyboard/mouse.
 *==========================================================================*/

function image_browser(evt)
{
  var
    n = Number($(evt.target).attr('data-n'));

  //-------------------------------------------------------------------------
  //--- function for putting the image into DOM -----------------------------
  //-------------------------------------------------------------------------

  function show_item(n)
  {
    var item = gallery.items[n], el, old_el, caption;

    //--- prepare caption (if specified)

    if(
      item.type == 'image'
      && 'caption' in item
    ) {
      caption = $('<span>', {
        class: 'caption'
      }).text(item.caption);
    }

    //--- prepare IMG element

    if(item.type == 'image') {
      el = $('<img>', {
        src:      item.src,
        srcset:   item.srcset
      });
    } else

    //--- prepare VIDEO element

    if(item.type == 'video') {
      el = $('<video></video>', {
        controls: "",
        autoplay: "1",
        src:      item.src
      });
    }

    //--- put the new image into DOM, replacing the current one

    if(el) {
      // place the image
      old_el = $('div.browser img, div.browser video');
      if(old_el.length) {
        old_el.replaceWith(el);
      } else {
        $('div.browser').append(el);
      }
      // place the caption
      old_el = $('div.browser span.caption');
      if(old_el.length) {
        if(caption) {
          old_el.replaceWith(caption);
        } else {
          old_el.remove();
        }
      } else {
        if(caption) {
          $('div.browser').append(caption);
        }
      }
    }
  }

  //-------------------------------------------------------------------------
  //--- function for navigating the image browser ---------------------------
  //-------------------------------------------------------------------------

  function navigate(action)
  {
    var upcoming;

    // exit the browser
    if(action == 'exit') {
      kbd_handler_pop();
      $('div.browser').off('click').empty().hide();
      $('div.gallery').show();
      $('div.mosaic').trigger('jqMosaicRefit');
    }

    // navigate to previous image
    else if(action == 'prev' && n > 0) {
      n = n - 1;
      show_item(n);
    }

    // navigate to next image
    else if(action == 'next' && n < gallery.items.length - 1) {
      n = n + 1;
      show_item(n);
    }

    // navigate to the first image
    else if(action == 'first') {
      n = 0;
      show_item(n);
    }

    // navigate to the last image
    else if(action == 'last') {
      n = gallery.items.length - 1;
      show_item(n);
    }
  }

  //--- hide the main gallery

  $('div.gallery').hide();

  //--- put the image into DOM

  show_item(n);

  //--- click handler

  // there are three evenly spaced vertical areas in the viewport, that
  // when clicked do the following (numbered from 0 left-to-right):
  // 0: go to prev image, 1: exit to the gallery, 2: go to next image

  $('div.browser').on('click', function(evt) {
    navigate(click_action($('div.browser'), evt));
  });

  //--- keypress handler

  kbd_handler_push(function(evt) {
    if(evt.keyCode == 37) { navigate('prev'); return false; }
    if(evt.keyCode == 39) { navigate('next'); return false; }
    if(evt.keyCode == 27) { navigate('exit'); return false; }
    if(evt.keyCode == 38) { navigate('first'); return false; }
    if(evt.keyCode == 40) { navigate('last'); return false; }
    return true;
  });

  //--- make everything visible

  $('div.browser').show();
}


/*==========================================================================*
  Render the gallery using the jquery.mosaic plugin.
 *==========================================================================*/

function render_page()
{
  //------------------------------------------------------------------------
  //--- function for navigating the gallery --------------------------------
  //------------------------------------------------------------------------

  function navigate(action)
  {
    if('navigate' in gallery) {
      if(action == 'next' && 'next' in gallery.navigate) {
        window.location.assign(gallery.navigate.next);
      }
      if(action == 'prev' && 'prev' in gallery.navigate) {
        window.location.assign(gallery.navigate.prev);
      }
      if(action == 'exit' && 'exit' in gallery.navigate) {
        window.location.assign(gallery.navigate.exit);
      }
    }
  }

  //--- fill in date and title

  if('date' in gallery) {
    $('span.date').text(gallery.date);
  }

  if('title' in gallery) {
    $('span.title').text(gallery.title);
  }

  //--- navigation elements (if specified)

  if('navigate' in gallery) {
    for(var nav in gallery.navigate) {
      if(nav) {
        $('a#nav-' + nav)
          .attr('href', gallery.navigate[nav])
          .css('display', 'inline-block');
      }
    }
  }

  //--- put in the images/videos

  if('items' in gallery) {
    for(var i = 0, max = gallery.items.length; i < max; i++) {
      var item = gallery.items[i];

      // image

      if(item.type == 'image') {
        $('<img>', {
          src:      item.src,
          srcset:   item.srcset,
          width:    item.width,
          height:   item.height,
          "data-n": i
        })
        .on('click', image_browser)
        .appendTo('div.mosaic');
      }

      // video

      else if(item.type == 'video') {
        $('<video></video>', {
          controls: "",
          src:      item.src,
          width:    item.width,
          height:   item.height,
          "data-n": i
        })
        .appendTo('div.mosaic');
      }
    }

    $('div.mosaic').Mosaic(
      'jquery-mosaic' in gallery ? gallery["jquery-mosaic"] : {
        "maxRowHeightPolicy" : "tail",
        "innerGap" : 4
      }
    );

  } else {
    $('<p>Sorry, this gallery seems to be misconfigured</p>')
    .appendTo('body');
  }

  //--- keyboard shortcus

  kbd_handler_push(function(evt) {
    if(evt.keyCode == 37) { navigate('prev'); return false; }
    if(evt.keyCode == 39) { navigate('next'); return false; }
    if(evt.keyCode == 27) { navigate('exit'); return false; }
    return true;
  });
}


/*==========================================================================*
  MAIN
 *==========================================================================*/

$(document).ready(function() {

  $('body').overlayScrollbars({
    className: "os-theme-dark",
    resize: "none",
    sizeAutoCapable: false,
    clipAlways: true,
    normalizeRTL: true,
    paddingAbsolute: false,
    autoUpdate: null,
    autoUpdateInterval: 33,
    nativeScrollbarsOverlaid: {
    showNativeScrollbars: false,
    initialize: true
  },
  overflowBehavior : {
    x: "hidden",
    y: "scroll"
  },
  scrollbars : {
    visibility: "hidden",
    autoHide: "move",
    autoHideDelay: 800,
    dragScrolling: true,
    clickScrolling: true,
    touchSupport: true
    }
  });

  $.get("index.json", function(data) { gallery = data; render_page(); });
});


})();
