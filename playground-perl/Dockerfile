FROM perl

RUN cpanm Mojolicious::Lite
RUN cpanm List::MoreUtils::XS
RUN cpanm Perl::Critic

RUN mkdir /code

ADD . /code/

WORKDIR /code
CMD morbo web.pl
