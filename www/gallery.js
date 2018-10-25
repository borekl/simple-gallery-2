(function() {

var gallery;


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
    n = Number($(evt.target).attr('data-n')),
    item = gallery.items[n];

  //--- hide the main gallery

  $('div.gallery').hide();

  //--- put the image into DOM

  $('<img>', {
    src:      item.src,
    srcset:   item.srcset
  })
  .appendTo('div.browser');

  //--- closing the image browser

  function navigate(action)
  {
    var upcoming;

    // exit the browser
    if(action == 'exit') {
      $('document').off('keypress');
      $('div.browser').off('click').empty().hide();
      $('div.gallery').show();
    }

    // navigate to previous image
    else if(action == 'prev' && n > 0) {
      n = n - 1;
      upcoming = gallery.items[n];
    }

    // navigate to next image
    else if(action == 'next' && n < gallery.items.length - 1) {
      n = n + 1;
      upcoming = gallery.items[n];
    }

    // navigate to the first image
    else if(action == 'first') {
      n = 0;
      upcoming = gallery.items[n];
    }

    // navigate to the last image
    else if(action == 'last') {
      n = gallery.items.length - 1;
      upcoming = gallery.items[n];
    }

    // switch to the selected image
    if(upcoming) {
      $('div.browser img').replaceWith($('<img>', {
        src:    upcoming.src,
        srcset: upcoming.srcset
      }));
    }
  }

  //--- click handler

  // there are three evenly spaced vertical areas in the viewport, that
  // when clicked do the following (numbered from 0 left-to-right):
  // 0: go to prev image, 1: exit to the gallery, 2: go to next image

  $('div.browser').on('click', function(evt) {
    navigate(click_action($('div.browser'), evt));
  });

  //--- keypress handler

  $(document).on('keydown', function(evt) {
    if(evt.keyCode == 37) { navigate('prev'); }
    if(evt.keyCode == 39) { navigate('next'); }
    if(evt.keyCode == 27) { navigate('exit'); }
    if(evt.keyCode == 38) { navigate('first'); }
    if(evt.keyCode == 40) { navigate('last'); }
  });

  //--- make everything visible

  $('div.browser').show();
}


/*==========================================================================*
  Render the gallery using the jquery.mosaic plugin.
 *==========================================================================*/

function render_page()
{
  //--- fill in date and title

  if('date' in gallery) {
    $('span.date').text(gallery.date);
  }

  if('title' in gallery) {
    $('span.title').text(gallery.title);
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
      'jquery-mosaic' in gallery ? gallery["jquery-mosaic"] : {}
    );

  } else {
    $('<p>Sorry, this gallery seems to be misconfigured</p>')
    .appendTo('body');
  }
}


/*==========================================================================*
  MAIN
 *==========================================================================*/

$(document).ready(function() {
  $.get("index.json", function(data) { gallery = data; render_page(); });
});


})();