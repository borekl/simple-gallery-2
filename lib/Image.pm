#!/usr/bin/perl

#=============================================================================
# Class to represent single image.
#=============================================================================

package Image;

use v5.10;
use Moo;
use Image::Size;


#=============================================================================
#=== ATTRIBUTES ==============================================================
#=============================================================================

# images identification string, possibly basename or numerical index, this
# has to be supplied by the caller

has id => (
  is => 'ro',
  required => 1,
);

# backlink to image's gallery object

has gallery => (
  is => 'ro',
  required => 1,
);

# set of image DPR variants as hash DPR => image filename; at least one
# image must be present; the image filename should be relative to base
# gallery directory

has imgset => (
  is => 'ro',
  default => sub { {} },
);

# image dimensions/aspect ratio

has w => ( is => 'rwp' );
has h => ( is => 'rwp' );
has ratio => ( is => 'rwp' );

# optional image caption

has caption => (
  is => 'lazy',
);



#=============================================================================
#=== METHODS =================================================================
#=============================================================================


#-----------------------------------------------------------------------------
# Probe image to get its pixel dimensions
#-----------------------------------------------------------------------------

sub probe
{
  my ($self) = @_;

  #--- get the lowest available DPR, we are assuming this will never be
  #--- below 1

  my ($dpr) = sort { $a <=> $b } keys %{$self->imgset()};
  die "Image '" . $self->id() . "' has no srcset variants" if !$dpr;

  #--- get image dimensions

  my $file = join('/', $self->gallery()->dir(), $self->imgset()->{$dpr});
  my ($w, $h) = imgsize($file);
  die "Cannot get image dimensions for $file" if !$w || !$h;

  $self->_set_w(int($w / $dpr));
  $self->_set_h(int($h / $dpr));
  $self->_set_ratio($w / $h);

  #--- finish

  return $self;
}


#-----------------------------------------------------------------------------
# Return conventional SRC attribute value, the highest DPR available is
# preferred.
#-----------------------------------------------------------------------------

sub src
{
  my ($self) = @_;

  my ($dpr) = sort { $b <=> $a } keys %{$self->imgset()};
  $self->imgset()->{$dpr};
}


#-----------------------------------------------------------------------------
# Return the SRCSET attribute value.
#-----------------------------------------------------------------------------

sub srcset
{
  my ($self) = @_;
  my $is = $self->imgset();

  my @re = map { $is->{$_} . ' ' . $_ . 'x'  } keys %{$is};

  return wantarray ? @re : join(', ', @re);
}


#-----------------------------------------------------------------------------
# Add an image to imgset.
#-----------------------------------------------------------------------------

sub add_image
{
  my ($self, $dpr, $file) = @_;

  $self->imgset()->{$dpr} = $file;

  return $self;
}


#-----------------------------------------------------------------------------
# Export data about the image
#-----------------------------------------------------------------------------

sub export
{
  my ($self) = @_;

  my %data = (
    id       => $self->id(),
    width    => $self->w(),
    height   => $self->h(),
    src      => $self->src(),
    type     => 'image',
    srcset   => join(', ', $self->srcset()),
  );

  if($self->caption()) {
    $data{'caption'} = $self->caption();
  }

  return \%data;
}



#=============================================================================

1;
