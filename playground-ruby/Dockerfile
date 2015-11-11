FROM ruby

RUN gem install sinatra
RUN gem install rubocop

RUN mkdir /code

ADD . /code/

WORKDIR /code
CMD ruby web.rb