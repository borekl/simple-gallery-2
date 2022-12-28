
# simple-gallery-2

**NOTE**: this application is now obsolete and was replaced by
[gallerizr](https://github.com/borekl/gallerizr).

Minimalistic no-frills image gallery that puts images/videos into the
centre of user's experience. It supports responsive images,
navigation with keyboard and has some support for collections of galleries.

This is a rewrite of
[simple-gallery](https://github.com/borekl/simple-gallery) that modularizes the
backend code, switches the tiling library and hopefully improves all around
code quality.

**Work in progress, not for production yet**

## Why Another Gallery

I have written this gallery to let me serve image galleries from my own home
server. I am on of those people who don't want to put every picture they
take on some cloud server, so I needed some simple but reasonably pretty and
performant solution. These are my requirements:

* fast full-viewport photo browsing -- as if you were browsing directory of
pictures in IrfanView: no effects, no slideshows, no bullshit; and operated with
keyboard in addition to mouse
* support for videos, the gallery can contain videos that are handled mostly
same as pictures
* support for HiDPI displays (that is displays with DPR higher than one)
* optionally, pictures can be captioned
* support for sets of galleries

## Dependencies

* jQuery
* [jQuery Mosaic plugin](https://github.com/tin-cat/jquery-mosaic)
* [Overlay Scrollbars](https://github.com/KingSora/OverlayScrollbars)
* Perl 5, plus following modules Moo, File::Slurper, Image::Size, Text::Pluralize
(for release version, these will be packed into the backend tool, so you won't
need to install them separately)
* libav-tools (if you want to support videos)

## The Gallery Images

Single gallery is a set of files and directories contained in its gallery directory.
The most important files are the images. These are in directories depending on their
target [DPR](https://stackoverflow.com/questions/8785643/what-exactly-is-device-pixel-ratio):
`1x` for DPR of 1, `2x` for DPR of 2 etc. It's totally up to you if you want to support
higher DPRs. It's also no problem to provide only, say DPR 2 images -- the gallery will
present the images correctly and the browser will adapt them for standard DPR displays.
You can even mix DPRs, ie. have some images only for DPR 1, some for DPR 2 etc. The only
limitation is that the DPRs must be integer. If you have no idea what the above means,
just put all your images into `1x` subdirectory of the gallery directory and be done.

## The Gallery Info

In the gallery directory there must be a file with information about the gallery called
`info.json`. It is a [JSON](https://en.wikipedia.org/wiki/JSON) file that looks like this:

    {
      "date" : "May 24, 2017",
      "title" : "Expedition to Nordkap"
    }

The above example defines the only two pieces information that are strictly required.
The title and date will be displayed at the top of the gallery. Optionally, you can
provide image captions:

    {
      "date" : "May 24, 2017",
      "title" : "Expedition to Nordkap",
      "captions" : {
        "IMG_1001" : "The journey begins here",
        "IMG_1099" : "We have reached this lovely little stream"
      }
    }

The captions will be show when browsing the individual images. The key in the JSON file
is the images' basename -- ie. strip the .jpg extension.

This file needs to be processed by the `gallery.pl` script to produce `index.json`.
This file is then read by the gallery front-end code to know what images there
are. Just run the `gallery.pl` in the gallery directory and verify the `index.json`
got produced.

## The Gallery Template

`gallery.html` contains a skeleton file for the gallery. This needs to be present
in the gallery directory. You can either copy it there, or configure your web server
serve it when accessing gallery directories.

This skeleton file is your point of customization. Here you can link your own CSS
stylesheet or modify the HTML itself.

## Deep Linking and History

The gallery allows linking directly to an image and it will correctly insert
history entries into browser history for every nagivational action in the gallery.
The URL in the URL bar will update accordingly and can always be used to get to exactly
that point in the gallery by just using the same URL. For reference, if your gallery
resides at:

    https://www.myweb.com/gallery/

Then deep-linked image `IMG_0001.jpg` will have following URL:

    https://www.myweb.com/gallery/IMG_0001/

## Web Server Setup

The webserver needs to be setup as front-controller for the gallery (or galleries).
Suppose we want any directory under `/photos` to be served as gallery. In Apache
the front-controller setup can be achieved with following config:

    <Directory /www/photos>
      RewriteEngine On
      RewriteBase "/photos/"
      RewriteRule "\.json$" - [L]
      RewriteCond %{REQUEST_FILENAME} !-f
      RewriteRule . /lib/gallery/gallery.html [L]
    </Directory>

This achieves following things:

* every request starting with /photos/ will be handled according to following rules
* if the request is for file with `.json` suffix, that request will go through as usual
* if the request is for file that exists on web server filesystem, the file will be served as usual
* any other request will return as if it were requesting `/lib/gallery/gallery.html`

Note, that this set up interferes with `DirectoryIndexes`. You can exclude specific paths
by adding `RewriteRule` statements with the `[L]` target.

## Gallery Sets

The `gallery.pl` script operates in two modes. When it sees `info.json` in current
directory it assumes *single gallery mode*. If `info.json` is not found, the script
assumes that the subdirectories are individual galleries and:

* compiles each gallery's `index.json`
* generates `gset.json` file that briefly describes every gallery

The `gset.json` can be used by custom front-end code to display the gallery set.
This code is not part of this project (at least for now).
