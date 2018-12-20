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

  if(keycode in lut) {
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
  This implements the gallery logic. The two arguments define the initial
  state of the gallery:

    d ......... this contains two keys: 'idx' is the contents of 'index.json'
                file, 'path' contains gallery's base path
    item_id ... if this is defined, it contains an item id (basename of a
                gallery image or video), that the gallery is to start with
                in image browsing mode.
 *==========================================================================*/

function gallery(d, item_id)
{
  // data from gallery's index.json
  var g = d.idx;
  // gallery mode
  var mode = document.location.pathname == d.path + '/' ? 'gallery' : 'browser';
  // galery initialized flag
  var gallery_initialized = 0;
  // index of current image/video in image browser mode
  var item_idx;

  //------------------------------------------------------------------------
  //--- function for navigating between galleries --------------------------
  //------------------------------------------------------------------------

  function navigate(action)
  {
    // gallery navigation

    if(mode == 'gallery') {
      if(
        !'navigate' in g             // no navigation directions defined
        || !action in g.navigate     // this particular navigation not defined
      ) { return; }
      window.location.assign(g.navigate[action]);
    }

    // image browser navigation

    else {
      var old_idx = item_idx;

      if(action == 'exit') {
        item_idx = null;
        gallery();
        return;
      }
      if(action == 'prev' && item_idx != 0) {
        item_idx--;
      }
      if(action == 'next' && item_idx != g.items.length - 1) {
        item_idx++;
      }
      if(action == 'first') {
        item_idx = 0;
      }
      if(action == 'last') {
        item_idx = g.items.length - 1;
      }

      if(old_idx != item_idx) {
        browser();
      }
    }
  }

  //------------------------------------------------------------------------
  //--- function for setting the title -------------------------------------
  //------------------------------------------------------------------------

  function set_window_title()
  {
    if(mode == 'browser') {
      window.document.title = g.title + ' : ' + g.items[item_idx].id;
    } else {
      window.document.title = g.title;
    }
  }

  //------------------------------------------------------------------------
  //--- function for setting the top of the gallery ------------------------
  //------------------------------------------------------------------------

  function gallery_top()
  {
    // date and title

    if('date' in g) { $('span.date').text(g.date); }
    if('title' in g) { $('span.title').text(g.title); }

    // navigation elements

    if(!'navigate' in g) { return; }
    for(var nav in g.navigate) {
      if(nav) {
        $('a#nav-' + nav)
          .attr('href', g.navigate[nav])
          .css('display', 'inline-block');
      }
    }
  }

  //------------------------------------------------------------------------
  //--- function for adding items to the gallery ---------------------------
  //------------------------------------------------------------------------

  function create_gallery_item(item)
  {
    var el;

    if(item.type == 'image') {
      el = $('<img>', { srcset: item.srcset });
    } else if(item.type == 'video') {
      el = $('<video></video>', { controls: "" });
    }

    el.attr({
      src:       item.src,
      width:     item.width,
      height:    item.height,
      "data-id": item.id
    });

    return el;
  }

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

  //------------------------------------------------------------------------
  //--- function for handling the mosaiced gallery mode --------------------
  //------------------------------------------------------------------------

  function gallery()
  {
    // make gallery visible, if needed

    if(mode == 'browser') {
      $('div.browser').hide();
      $('div.gallery').show();
      mode = 'gallery';
      set_window_title();
    }
    //--- put in the images/videos and run the mosaic

    if(!gallery_initialized) {
      gallery_top();
      for(var i = 0, max = g.items.length; i < max; i++) {
        create_gallery_item(g.items[i])
        .on('click', browser)
        .appendTo('div.mosaic');
      }

      $('div.mosaic').Mosaic(
        'jquery-mosaic' in g ? g["jquery-mosaic"] : {
          "maxRowHeightPolicy" : "tail",
          "innerGap" : 4
        }
      );
      gallery_initialized = 1;
    }
  }

  //------------------------------------------------------------------------
  //--- image browser ------------------------------------------------------
  //------------------------------------------------------------------------

  function browser(evt)
  {
    //--- process the argument

    // the argument to browser can be one these things:
    //
    // 1. String
    // """""""""
    // This is interpreted as item id and is used for deep-linking directly
    // to images.
    //
    // 2. Click event, class 'browser'
    // """""""""""""""""""""""""""""""
    // This is caused by clicking on browser DIV in image browsing mode, this
    // is interpreted as click to navigate the browser.
    //
    // 3. Click event
    // """"""""""""""
    // This is caused by invocation of click handler on gallery image in the
    // mosaiced gallery mode. The code looks for "data-id" attribute to get
    // image/video's item id.
    //
    // 4. None
    // """""""
    // Just use current value of 'item_idx', this is used for keyboard
    // navigation where the handler exists outside of the browser code

    var item_id, nav;

    if(evt instanceof Object) {
      // case 2, click on the browser DIV
      if($(evt.currentTarget).hasClass('browser')) {
        nav = click_action($(evt.currentTarget), evt);
      }
      // case 3, click on mosaiced gallery image/video element
      else {
        item_id = $(evt.target).attr('data-id');
      }
    } else if(evt) {
      // case 1, item id submitted directly
      item_id = evt;
    }

    //--- mouse navigation handling

    if(nav) { navigate(nav); return; }

    //--- find the actual item by its item id

    // this is only invoked when we are starting the browser up, which means
    // there is no current message (with index 'item_idx'; this also means
    // the 'item_id' is defined an is to be used to find the item

    if(item_idx == null) {
      item_idx = g.items.findIndex(function(el) {
        return el.id == item_id;
      });
    }

    //--- display one image

    show_item(item_idx);

    //--- make the browser visible, if needed

    if(mode == 'gallery' || $('div.browser').is(':hidden')) {
      $('div.gallery').hide();
      $('div.browser').show();
      mode = 'browser';
    }

    //--- update window title

    set_window_title();

  }

  //------------------------------------------------------------------------
  //--- MAIN ---------------------------------------------------------------
  //------------------------------------------------------------------------

  $(document).on('keydown', function(evt) {
    var nav = keycode_to_nav(evt.keyCode);
    if(!nav) {
      return true;
    } else {
      navigate(nav);
      return false;
    }
  });

  $('div.browser').click(function(evt) {
    browser(evt);
  });

  if(mode == 'gallery') {
    gallery();
  } else {
    browser(item_id);
  }
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
        d.resolve({ idx: data, path: path2 }, item_id );
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
    function(d, item_id) {
      console.log('Loading successful, path=%s, itemid=%s', d.path, item_id);
      $('<base>').attr('href', d.path + '/').appendTo($('head'));
      gallery(d, item_id);
    },
    function(err) {
      console.log('Loading failed (%s)', err);
    }
  );

});


})();
