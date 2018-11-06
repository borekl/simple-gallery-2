#!/usr/bin/perl

#=============================================================================
# Class to represent single gallery.
#=============================================================================

package Gallery;

use Image;
use Video;

use v5.10;

use FindBin qw($Bin);
use lib "$Bin/lib";
use Moo;
use Cwd qw(getcwd);
use JSON;
use File::Slurper qw(read_binary write_binary read_dir);



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

  #--- read directory contents

  my @dir = read_dir($self->dir());
  my @dirs = grep { -d $_ } @dir;
  my @files = grep { -f $_ } @dir;

  #--- srcset DPRs available

  $self->_set_imgset(
    [ map { /(\d)x/; $1; } grep { /^[1-4]x$/; } @dirs ]
  );

  #--- read list of images/videos

  my %items;

  foreach my $dpr (@{$self->imgset()}) {
    do {
      if(!exists $items{$_}) {
        $items{$_} = Image->new(
          filename => $_,
          gallery => $self,
        );
      }
      $items{$_}->add_dpr($dpr);
    } for grep { /\.jpg$/ } read_dir(
      join('/', $self->dir(), $dpr . 'x')
    );
  }

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

  foreach my $key (qw(title date jquery-mosaic)) {
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
