#!/usr/bin/perl

#=============================================================================
# Class to represent single video. Avprobe needs to be installed in the
# system
#=============================================================================

package Video;

use v5.10;
use Moo;

use JSON;



#=============================================================================
#=== ATTRIBUTES ==============================================================
#=============================================================================

# video's filename (without path)

has filename => (
  is => 'ro',
  required => 1,
);

# video's filename with extension stripped

has basename => (
  is => 'lazy',
);

# backlink to image's gallery

has gallery => (
  is => 'ro',
  required => 1,
);

# video dimensions/aspect ratio

has w => ( is => 'rwp' );
has h => ( is => 'rwp' );
has ratio => ( is => 'rwp' );



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
# Probe image to get its pixel dimensions
#-----------------------------------------------------------------------------

sub probe
{
  my ($self) = @_;
  my ($w, $h);

  #--- read and decode avprobe output

  my $file = join('/', $self->gallery()->dir(), 'video', $self->filename());
  open(my $fh, "avprobe -of json -show_streams $file 2>/dev/null |")
    or die 'Failed to invoke avprobe';
  my $vi_json = do { local $/; <$fh>; };
  my $vi = decode_json($vi_json);
  close($fh);

  #--- extract video resolution

  for my $stream (@{$vi->{'streams'}}) {
    if($stream->{'codec_type'} eq 'video') {
      $w = $stream->{'width'};
      $h = $stream->{'height'};
    }
  }

  #--- store video dimensions

  $self->_set_w(int($w));
  $self->_set_h(int($h));
  $self->_set_ratio($w / $h);

  #--- finish

  return $self;
}


#-----------------------------------------------------------------------------
# Return conventional SRC attribute value
#-----------------------------------------------------------------------------

sub src
{
  my ($self) = @_;

  return join('/', 'video', $self->filename());
}


#-----------------------------------------------------------------------------
# Export data about the image
#-----------------------------------------------------------------------------

sub export
{
  my ($self) = @_;

  return {
    width    => $self->w(),
    height   => $self->h(),
    ratio    => $self->ratio(),
    src      => $self->src(),
    basename => $self->basename(),
    type     => 'video',
  }
}



#=============================================================================

1;
