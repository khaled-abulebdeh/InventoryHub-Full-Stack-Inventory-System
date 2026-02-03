from Services.purchase_order_service import get_all_purchase_orders, get_purchase_order

print("--- Fetching All POs ---")
all_pos = get_all_purchase_orders()
if all_pos:
    print(f"Found {len(all_pos)} POs")
    first_po_id = all_pos[0]['PO_ID']
    print(f"Inspecting PO ID: {first_po_id}")
    
    print("\n--- Fetching Single PO Details ---")
    po_detail = get_purchase_order(first_po_id)
    if po_detail:
        print(f"PO ID: {po_detail.get('PO_ID')}")
        print(f"Supplier: {po_detail.get('Supplier_Name')}")
        print(f"Created By Name: {po_detail.get('Created_By_Name')}")
        print(f"Estimated Arrival: {po_detail.get('Estimated_Arrival_Date')}")
        items = po_detail.get('Items', [])
        print(f"Items Count: {len(items)}")
        for item in items:
             print(f" - Item: {item.get('SKU')}, LeadTime: {item.get('Lead_Time_Days')}")
    else:
        print("PO Detail returned None")
else:
    print("No POs found")
