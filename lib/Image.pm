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

# image's filename (without path)

has filename => (
  is => 'ro',
  required => 1,
);

# image's filename with extension stripped

has basename => (
  is => 'lazy',
);

# backlink to image's gallery

has gallery => (
  is => 'ro',
  required => 1,
);

# list of available DPRs

has srcset => (
  is => 'ro',
  default => sub { [] },
);

# image dimensions/aspect ratio

has w => ( is => 'rwp' );
has h => ( is => 'rwp' );
has ratio => ( is => 'rwp' );

# image caption

has caption => (
  is => 'lazy',
);



#=============================================================================
#=== METHODS =================================================================
#=============================================================================

#-----------------------------------------------------------------------------
# Create basename attribute from filename
#-----------------------------------------------------------------------------

sub _build_basename
{
  my ($self) = @_;

  my $filename = $self->filename();
  $filename =~ s/\.[^.]+$//;

  return $filename;
}


#-----------------------------------------------------------------------------
# Build caption attribute
#-----------------------------------------------------------------------------

sub _build_caption
{
  my ($self) = @_;
  my $gallery = $self->gallery()->info();

  if(
    exists $gallery->{'captions'}
    && exists $gallery->{'captions'}{$self->filename()}
  ) {
    return $gallery->{'captions'}{$self->filename()};
  } else {
    return undef;
  }
}


#-----------------------------------------------------------------------------
# Add a DPR variant
#-----------------------------------------------------------------------------

sub add_dpr
{
  my ($self, $dpr) = @_;

  push(@{$self->srcset()}, $dpr);
  return $self;
}


#-----------------------------------------------------------------------------
# Probe image to get its pixel dimensions
#-----------------------------------------------------------------------------

sub probe
{
  my ($self) = @_;

  #--- get the lowest available DPR, we are assuming this will never be
  #--- below 1

  my ($dpr) = sort { $a <=> $b } @{$self->srcset()};
  die "Image '" . $self->filename() . "' has no srcset variants" if !$dpr;

  #--- get image dimensions

  my ($w, $h) = imgsize(
    join('/', $self->gallery()->dir(), "${dpr}x", $self->filename())
  );
  die "Cannot get image dimensions" if !$w || !$h;

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

  my ($dpr) = sort { $b <=> $a } @{$self->srcset()};
  return join('/', $dpr . 'x', $self->filename());
}


#-----------------------------------------------------------------------------
# Export data about the image
#-----------------------------------------------------------------------------

sub export
{
  my ($self) = @_;
  my $gallery = $self->gallery();

  my %data = (
    width    => $self->w(),
    height   => $self->h(),
    src      => $self->src(),
    basename => $self->basename(),
    type     => 'image',
    srcset   => [ map {
                  $_ . 'x/' . $self->filename . ' ' . $_ . 'x'
                } @{$self->srcset()} ],
  );

  if($self->caption()) {
    $data{'caption'} = $self->caption();
  }

  return \%data;
}



#=============================================================================

1;
