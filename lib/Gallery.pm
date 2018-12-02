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
use File::stat;

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

has videos => (
  is => 'rwp',
);

has update_needed => (
  is => 'rwp',
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

  #--- decide whether the index.json file needs to be updated

  my $index = $self->dir() . '/index.json';
  if(
    !-f $info
    || stat($info)->mtime() > stat($index)->mtime()
  ) {
    $self->_set_update_needed(1);
  }

  #--- read directory contents

  my @dir = read_dir($self->dir());
  my @dirs = grep { -d $_ } @dir;
  my @files = grep { -f $_ } @dir;

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
        $items{$_} = Video->new(
         filename => $_,
         gallery => $self,
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

}


#=============================================================================
#=== METHODS =================================================================
#=============================================================================

#-----------------------------------------------------------------------------
# Add image(s) to the gallery.
#-----------------------------------------------------------------------------

sub add_item
{
  my ($self, @items) = @_;

  push(@{$self->items()}, @items);
  return $self;
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

  foreach my $key (qw(title date jquery-mosaic navigate)) {
    if(exists $info->{$key}) {
      $data{$key} = $info->{$key}
    }
  }

  foreach my $item (@{$self->items()}) {
    push(@{$data{'items'}}, $item->export());
  }

  write_binary(
    $index_file,
    $js->utf8()->encode(\%data),
  );

  return $self;
}



#=============================================================================

1;
