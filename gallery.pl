#!/usr/bin/perl

use v5.10;
use utf8;
use FindBin qw($Bin);
use lib "$Bin/lib";

use Gallery;

Gallery->new()->write_index('index.json');
