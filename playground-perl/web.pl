use Dancer2;

my $world = 'World' if 1;

get '/' => sub {
    "Hello $world!"
};

dance;