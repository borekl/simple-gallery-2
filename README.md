# simple-gallery-2

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
to make it the default index for the directory or directories. In Apache this can
be achieved by following config snippet:

    <Directory /www/galleries>
      DirectoryIndex /gallery/gallery.html
    </Directory>

This skeleton file is your point of customization. Here you can link your own CSS
stylesheet or modify the HTML itself.

## Gallery Sets

The `gallery.pl` script operates in two modes. When it sees `info.json` in current
directory it assumes *single gallery mode*. If `info.json` is not found, the script
assumes that the subdirectories are individual galleries and:

* compiles each gallery's `index.json`
* generates `gset.json` file that briefly describes every gallery

The `gset.json` can be used by custom front-end code to display the gallery set.
This code is not part of this project (at least for now).
