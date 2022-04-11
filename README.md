# F-klubben's inventory solution

A tool for counting the inventory in F-klubben.

## Hardware
The page is intended for a [barcode scanner](https://en.wikipedia.org/wiki/Barcode_reader).
The specific model in mind is the [Netum NT-1698W](https://www.netum.net/products/nt-1698w-2-4g-wireless-laser-barcode-scanner-read-1d-code).

## Dependencies
* [jQuery](https://jquery.com/) - for manipulating the DOM
* [JsBarcode](https://github.com/lindell/JsBarcode) - for generating barcodes
These are already shipped in the repository.

## Testing
Testing is done manually. To run a simple webserver (using Python3's [`http.server`](https://docs.python.org/3/library/http.server.html)), simply run the following command:
```bash
./test-server.sh
```
A webserver is now available at [http://localhost:8000/inventory.html](http://localhost:8000/inventory.html)