#!/usr/bin/perl

#=============================================================================
# Class to represent a set of galleries.
#=============================================================================

package GallerySet;

use v5.10;

use Gallery;

use FindBin qw($Bin);
use lib "$Bin/lib";
use Moo;
use Cwd qw(getcwd);
use File::Slurper qw(read_dir write_binary);



#=============================================================================
#=== ATTRIBUTES ==============================================================
#=============================================================================

# gallery set directory

has dir => (
  is => 'ro',
  default => sub { getcwd(); },
);

# array of Gallery instances

has galleries => (
  is => 'ro',
  default => sub { [] },
);



#=============================================================================
#=== METHODS =================================================================
#=============================================================================

#-----------------------------------------------------------------------------
# Read in the galleries.
#-----------------------------------------------------------------------------

sub BUILD
{
  my ($self) = @_;

  #--- check whether base directory exists

  if(!-d $self->dir()) {
    die sprintf(qq{The specified directory %s does not exist}, $self->dir());
  }

  #--- get list of directories that contain 'info.json'

  my @dirs = grep { -r "$_/info.json" } read_dir($self->dir());
  if(!@dirs) {
    die 'No valid gallery directories were found';
  }

  #--- try to scan the galleries, this populates the 'galleries'
  #--- array and also links the galleries through their next and prev
  #--- atributes

  my $galleries = $self->galleries();

  my $prev_g;
  foreach my $gdir (sort @dirs) {
    my $g = Gallery->new(
      gset => $self,
      dir => join('/', $self->dir(), $gdir),
      prev => $prev_g,
    );
    if($prev_g) { $prev_g->next($g); }
    push(@$galleries, $g);
    $prev_g = $g;
  }

  if(!@$galleries) {
    die "No valid galleries were loaded";
  }
}


#-----------------------------------------------------------------------------
# Return the number of galleries
#-----------------------------------------------------------------------------

sub count
{
  my ($self) = @_;

  return scalar(@{$self->galleries()});
}


#-----------------------------------------------------------------------------
# Return the galleries that need updating or their number according to the
# context.
#-----------------------------------------------------------------------------

sub update_needed
{
  my ($self) = @_;
  my @update_needed;

  $self->iter(sub {
    my $g = shift;
    if($g->update_needed()) {
      push(@update_needed, $g);
    }
  });

  return wantarray ? @update_needed : scalar(@update_needed);
}


#-----------------------------------------------------------------------------
# Iterate the galleries.
#-----------------------------------------------------------------------------

sub iter
{
  my ($self, $cb) = @_;
  my $gs = $self->galleries();

  return if !ref($cb);

  foreach my $g (@$gs) {
    $cb->($g);
  }
}


#-----------------------------------------------------------------------------
# Create or update galleries' index.json file.
#-----------------------------------------------------------------------------

sub update_galleries
{
  my ($self, $cb) = @_;

  $self->iter(sub {
    my $g = shift;
    $g->write_index();
    $cb->($g) if ref $cb;
  });
}


#-----------------------------------------------------------------------------
# Create gallery index.
#-----------------------------------------------------------------------------

sub write_index
{
  my ($self) = @_;
  my $js = JSON->new()->pretty(1);
  my %data;

  #--- prepare some variables

  my $galleries = $self->galleries();
  my $index_file = join('/', $self->dir(), 'gset.json');

  #--- order of directories, currently this is reverse alphabetic, but
  #--- eventually should be configurable in some way

  $data{'dirs_order'} = [
    map {
      $_->last_path_element()
    } sort {
      $b->last_path_element() cmp $a->last_path_element()
    } @$galleries
  ];

  #--- the galleries

  $self->iter(sub {
    my $g = shift;
    my $id = $g->last_path_element();
    $data{'dirs'}{$id} = {
      images => $g->count_images(),
      videos => $g->count_videos(),
    };

    if(exists $g->info()->{'date'}) {
      $data{'dirs'}{$id}{'date'} = $g->info()->{'date'};
    }

    if($g->thumbnail()) {
      $data{'dirs'}{$id}{'thumb'} = {
        src => join('/', $g->last_path_element(), $g->thumbnail()->src()),
        srcset => join(', ',
          map {
            $g->last_path_element() . '/' . $_
          } $g->thumbnail()->srcset()
        ),
      };
    }
  });

  #--- write out gset.json, the gallery set index; this is intended to be
  #--- used by custom front-end code not part of this application

  write_binary(
    $index_file,
    $js->utf8()->encode(\%data)
  );

  return $self;
}



#=============================================================================

1;
