import csv, json

def convert(file):
    with open(file, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))

for f in ["players","matches","appearances","teams"]:
    data = convert(f"{f}.csv")
    with open(f"../data/{f}.json","w",encoding="utf-8") as out:
        json.dump(data,out,indent=2)

print("Conversion complete.")
