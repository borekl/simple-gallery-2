(function() {

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
  Convert keycode to navigation direction word.
 *==========================================================================*/

function keycode_to_nav(keycode)
{
  var lut = {
    '37': 'prev',
    '39': 'next',
    '27': 'exit',
    '38': 'first',
    '40': 'last'
  };

  if(keycode.toString in lut) {
    return lut[keycode];
  } else {
    return null;
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

function image_browser(evt, g)
{
  var id, n;

  if(evt instanceof Object) {
    id = $(evt.target).attr('data-id');
  } else {
    id = evt;
  }

  //--- find the actual item by its item id

  n = g.items.findIndex(function(el) {
    return el.id == id;
  });

  //-------------------------------------------------------------------------
  //--- function for putting the image into DOM -----------------------------
  //-------------------------------------------------------------------------

  function show_item(n)
  {
    var item = g.items[n], el, old_el, caption;

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
    else if(action == 'next' && n < g.items.length - 1) {
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
      n = g.items.length - 1;
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
    var nav = keycode_to_nav(evt.keyCode);
    if(!nav) {
      return true;
    } else {
      navigate(nav); return false;
    }
  });

  //--- make everything visible

  $('div.browser').show();
}


/*==========================================================================*
  Render the gallery using the jquery.mosaic plugin.
 *==========================================================================*/

function gallery(d)
{
  var g = d.idx;  // data from gallery's index.json

  //------------------------------------------------------------------------
  //--- function for navigating between galleries --------------------------
  //------------------------------------------------------------------------

  function navigate(action)
  {
    if(
      !'navigate' in g             // no navigation directions defined
      || !action in g.navigate     // this particular navigation not defined
    ) { return; }

    window.location.assign(g.navigate[action]);
  }

  //--- set document title

  window.document.title = g.title;

  //--- fill in date and title

  if('date' in g) {
    $('span.date').text(g.date);
  }

  if('title' in g) {
    $('span.title').text(g.title);
  }

  //--- navigation elements (if specified)

  if('navigate' in g) {
    for(var nav in g.navigate) {
      if(nav) {
        $('a#nav-' + nav)
          .attr('href', g.navigate[nav])
          .css('display', 'inline-block');
      }
    }
  }

  //--- put in the images/videos

  if('items' in g) {
    for(var i = 0, max = g.items.length; i < max; i++) {
      var item = g.items[i];

      // image

      if(item.type == 'image') {
        $('<img>', {
          src:       item.src,
          srcset:    item.srcset,
          width:     item.width,
          height:    item.height,
          "data-id": item.id,
        })
        .on('click', function(evt) { image_browser(evt, g) })
        .appendTo('div.mosaic');
      }

      // video

      else if(item.type == 'video') {
        $('<video></video>', {
          controls: "",
          src:       item.src,
          width:     item.width,
          height:    item.height,
          "data-id": item.id,
        })
        .appendTo('div.mosaic');
      }
    }

    $('div.mosaic').Mosaic(
      'jquery-mosaic' in g ? g["jquery-mosaic"] : {
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
  Attempt to load index.json. This returns a Promise object, that on success
  returns object with { data, path, itemid } keys (the last one only when
  deep linking to specific item); on error HTTP response message is
  returned.
 *==========================================================================*/

function load_gallery_index()
{
  var path, path1, path2;
  var d = $.Deferred();     // jQuery Deferred object
  var q;                    // AJAX query promise

  // get paths to index.json on both current level and one directory up

  path = document.location.pathname.split('/');
  path.pop();
  path1 = path.join('/')

  item_id = path.pop();
  path2 = path.join('/');

  // try to load index.json from current directory level, if successful
  // terminate lookup and return parsed data

  q = $.get(path1 + '/index.json');
  q.done(function(data) {
    d.resolve({ idx: data, path: path1 });
  });

  // if not successful AND the response code is 404, try to find the index
  // at one directory level up

  q.fail(function(xhr) {
    if(xhr.status == 404) {
      var q_again = $.get(path2 + '/index.json');
      q_again.done(function(data) {
        d.resolve({ idx: data, path: path2, itemid: item_id });
      });
      q_again.fail(function(xhr) {
        d.reject(xhr.status + ' ' + xhr.statusText);
      });
    } else {
      d.reject(xhr.status + ' ' + xhr.statusText);
    }
  });

  // finish

  return d.promise();
}


/*==========================================================================*
  MAIN
 *==========================================================================*/

$(document).ready(function() {

  //--- initialize Overlay Scrollbars library

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

  //--- gallery invocation

  load_gallery_index().then(
    function(d) {
      console.log('Loading successful, path=%s, itemid=%s', d.path, d.itemid);
      gallery(d);
    },
    function(err) {
      console.log('Loading failed (%s)', err);
    }
  );

});


})();
