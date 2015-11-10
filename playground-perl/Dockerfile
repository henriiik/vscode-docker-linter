FROM perl

RUN cpanm Dancer2
RUN cpanm Perl::Critic

RUN mkdir /code

ADD . /code/

WORKDIR /code
CMD perl web.pl