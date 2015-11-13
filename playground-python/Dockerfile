FROM python

ENV PYTHONUNBUFFERED 1

RUN pip install Flask
RUN pip install flake8

RUN mkdir /code
ADD . /code/

WORKDIR /code
CMD python web.py