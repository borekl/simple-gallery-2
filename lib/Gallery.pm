#!/usr/bin/perl

#=============================================================================
# Class to represent single gallery.
#=============================================================================

package Gallery;

use v5.10;

use FindBin qw($Bin);
use lib "$Bin/lib";
use Moo;
use Cwd qw(getcwd);
use JSON;
use File::Slurper qw(read_binary write_binary read_dir);
use Carp;

use Image;
use Video;



#=============================================================================
#=== ATTRIBUTES ==============================================================
#=============================================================================

has dir => (
  is => 'ro',
  default => sub { getcwd(); },
);

has info => (
  is => 'rwp',
);

has imgset => (
  is => 'rwp',
  default => sub { [] },
);

has items => (
  is => 'ro',
  default => sub { [] },
);

has update_needed => (
  is => 'rwp',
);

has count_images => (
  is => 'rwp',
  default => 0,
);

has count_videos => (
  is => 'rwp',
  default => 0,
);

# optional thumbnail image (an Image instance) for the gallery

has thumbnail => (
  is => 'rwp',
  isa => sub {
    die 'Not an Image instance' unless ref $_[0] && $_[0]->isa('Image');
  },
);

# next/prev galleries

has next => (
  is => 'rw',
);

has prev => (
  is => 'rw',
);

# optional backreference to GallerySet, if this is set, the gallery will
# know it's part of a set of galleries and adjust some aspects of itself

has gset => (
  is => 'ro',
  isa => sub {
    die 'Not a GallerySet instance'
    unless ref $_[0] && $_[0]->isa('GallerySet');
  },
);



#=============================================================================
#=== CONSTRUCTOR =============================================================
#=============================================================================

sub BUILD
{
  my ($self) = @_;

  #--- check whether the directory exists

  if(!-d $self->dir()) {
    die 'The specified directory ' . $self->dir() . ' does not exist';
  }

  #--- check whether 'info.json' is present

  my $info = $self->dir() . '/info.json';
  if(!-r $info) {
    die qq{Info file $info does not exist};
  }

  #--- read and parse the info.json file

  my $info_json = read_binary($info);
  $self->_set_info(decode_json($info_json));

  #--- for compatibility: captions should normally reference image id,
  #--- which is currently the basename, but because the previous version
  #--- of the simple-gallery used filenames for this purpose, we suport both
  #--- ways by means of transforming the old way to the new on the fly

  if(exists $self->info()->{'captions'}) {
    foreach my $id (keys %{$self->info()->{'captions'}}) {
      if($id =~ /^(.*)\.jpg$/) {
        $self->info()->{'captions'}{$1} = $self->info()->{'captions'}{$id};
        delete $self->info()->{'captions'}{$id};
      }
    }
  }

  #--- read directory contents

  my @dir = read_dir($self->dir());
  my @dirs = grep { -d $self->dir() . '/' . $_ } @dir;
  my @files = grep { -f $self->dir() . '/' . $_ } @dir;

  #--- srcset DPRs available

  $self->_set_imgset(
    [ map { /(\d)x/; $1; } grep { /^[1-4]x$/; } @dirs ]
  );

  #--- read list of images

  my %items;

  # loop over available DPR directories

  foreach my $dpr (@{$self->imgset()}) {

  # loop over all JPEG files

    for my $file (
      grep { /\.jpg$/ }
      read_dir(join('/', $self->dir(), $dpr . 'x'))
    ) {

  # image's basename will serve as image id

      my $id = $file;
      $id =~ s/\.jpg$//;

  # if we don't have Image instance yet, create one

      if(!exists $items{$id}) {
        # see if there is an image caption
        my $caption;
        if(
          exists $self->info()->{'captions'}
          && exists $self->info()->{'captions'}{$id}
        ) {
          $caption = $self->info()->{'captions'}{$id}
        }
        # create Image instance
        $items{$id} = Image->new(
          id => $id,
          gallery => $self,
          caption => $caption,
        );
      }

  # add current image to the image set

      $items{$id}->add_image($dpr => "${dpr}x/$file");
    }
  }

  #--- read list of videos

  my $vid_path = join('/', $self->dir(), 'video');

  if(-d $vid_path) {
    do {
      if(!exists $items{$_}) {

        # image's basename will serve as image id

        my $id = $_;
        $id =~ s/\..*$//;

        $items{$_} = Video->new(
         filename => $_,
         gallery => $self,
         id => $id,
        );
      }
    } for grep { /\.mp4$/ } read_dir(
      join('/', $self->dir(), 'video')
    );
  }

  #--- add item to gallery, probe it

  foreach my $itm (sort keys %items) {
    $self->add_item($items{$itm}->probe());
  }

  #--- check if there are gallery thumbnails

  # thumbnails must be present in gallery's base directory and they have name
  # thumb.Nx.jpg where N is DPR; multiple DPR variants can be present;
  # currently only integer DPRs are supported for thumbnails

  my @thumb_files = grep { /^thumb.\dx.jpg$/ } @files;
  if(@thumb_files) {
    my $thumb = Image->new(
      id => 'thumb',
      gallery => $self,
    );
    foreach my $th (@thumb_files) {
      $th =~ /^thumb.(\d)x.jpg$/;
      $thumb->add_image($1 => $th);
    }
    $self->_set_thumbnail($thumb->probe());
  }

}



#=============================================================================
#=== METHODS =================================================================
#=============================================================================

#-----------------------------------------------------------------------------
# Add image(s) or video(s) to the gallery.
#-----------------------------------------------------------------------------

sub add_item
{
  my ($self, @items) = @_;

  foreach my $item (@items) {
    if(!ref($item)) {
      croak 'Invalid argument passed to add_item() (not a reference)';
    }
    if($item->isa('Image')) {
      $self->_set_count_images($self->count_images() + 1);
    } elsif($item->isa('Video')) {
      $self->_set_count_videos($self->count_videos() + 1);
    } else {
      croak 'Invalid argument passed to add_item() (not an Image or Video)';
    }
    push(@{$self->items()}, $item);
  }

  return $self;
}


#-----------------------------------------------------------------------------
# Get the deepest dirctory of the path where the gallery is stored.
#-----------------------------------------------------------------------------

sub last_path_element
{
  my ($self) = @_;

  my $path = $self->dir();
  $path =~ s/\/$//;
  my @path_elements = split(/\//, $path);

  return $path_elements[-1];
}


#-----------------------------------------------------------------------------
# Write out the index file.
#-----------------------------------------------------------------------------

sub write_index
{
  my ($self, $index_file) = @_;
  my %data;
  my $js = JSON->new()->pretty(1);
  my $info = $self->info();

  #--- target index file

  if(!$index_file) {
    $index_file = join('/', $self->dir(), 'index.json')
  }

  #--- collect the data

  foreach my $key (qw(title date jquery-mosaic navigate tags)) {
    if(exists $info->{$key}) {
      $data{$key} = $info->{$key}
    }
  }

  #--- collect the gallery items (images and videos)

  foreach my $item (@{$self->items()}) {
    push(@{$data{'items'}}, $item->export());
  }

  #--- if this gallery is part of a set, handle navigation items

  if($self->gset()) {
    $data{'navigate'}{'exit'} = '../';
    if($self->next()) {
      $data{'navigate'}{'next'}
      = '../' . $self->next()->last_path_element() . '/';
    }
    if($self->prev()) {
      $data{'navigate'}{'prev'}
      = '../' . $self->prev()->last_path_element() . '/';
    }
  }

  #--- write resulting index.json

  write_binary(
    $index_file,
    $js->utf8()->encode(\%data),
  );

  return $self;
}



#=============================================================================

1;
