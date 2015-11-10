use Dancer2;

my $world = 'World';

get '/' => sub {
    "Hello $world!"
};

dance;