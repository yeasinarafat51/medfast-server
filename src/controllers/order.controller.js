const { client } = require("../config/db");
const { ObjectId } = require("mongodb");

// নিরাপদ কালেকশন ফাংশন
const getCollections = () => {
  const db = client.db("medfast");
  return {
    orderCollection: db.collection("orders"),
    invoiceCollection: db.collection("invoices"),
    medicineCollection: db.collection("medicines"),
  };
};

// ======================================
// 1. Create Order
// ======================================
const createOrder = async (req, res) => {
  try {
    const { orderCollection, invoiceCollection, medicineCollection } =
      getCollections();
    const order = req.body;

    if (!order.items || order.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is Empty",
      });
    }

    let grandTotal = 0;
    const processedItems = [];

    // Check stock & prepare items
    for (const item of order.items) {
      if (!ObjectId.isValid(item.medicineId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid medicineId format",
        });
      }

      const medicine = await medicineCollection.findOne({
        _id: new ObjectId(item.medicineId),
      });

      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: `${item.medicineName || "Medicine"} not found`,
        });
      }

      const quantity = Number(item.quantity || 0);
      if (quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid quantity.",
        });
      }

      if (Number(medicine.stock || 0) < quantity) {
        return res.status(400).json({
          success: false,
          message: `${medicine.medicineName} Stock Unavailable`,
        });
      }

      const purchasePrice = Number(medicine.purchasePrice || 0);
      const sellingPrice = Number(item.unitPrice || medicine.sellingPrice || 0);
      const totalPrice = sellingPrice * quantity;
      const purchaseAmount = purchasePrice * quantity;
      const profit = totalPrice - purchaseAmount;

      grandTotal += totalPrice;

      processedItems.push({
        medicineId: item.medicineId,
        medicineName: medicine.medicineName || item.medicineName || "Medicine",
        company: medicine.company || item.company || "",
        quantity,
        unitPrice: sellingPrice,
        totalPrice,
        purchasePrice,
        purchaseAmount,
        profit,
      });
    }

    // Invoice Number তৈরি
    const totalInvoice = await invoiceCollection.countDocuments();
    const today = new Date();
    const invoiceNo = `INV-${today.getFullYear()}${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}${String(today.getDate()).padStart(
      2,
      "0",
    )}-${String(totalInvoice + 1).padStart(5, "0")}`;

    // নতুন অর্ডার তৈরি
    const newOrder = {
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      uid: order.uid || "",
      phone: order.phone || "",
      address: order.address || "",
      note: order.note || "",
      items: processedItems,
      grandTotal,
      paymentStatus: "Unpaid",
      orderStatus: "Pending",
      invoiceNo,
      orderDate: new Date(),
    };

    const result = await orderCollection.insertOne(newOrder);

    // স্টক কমানো
    for (const item of processedItems) {
      await medicineCollection.updateOne(
        { _id: new ObjectId(item.medicineId) },
        { $inc: { stock: -item.quantity } },
      );
    }

    // ইনভয়েস তৈরি
    const invoice = {
      invoiceNo,
      orderId: result.insertedId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      phone: order.phone || "",
      address: order.address || "",
      note: order.note || "",
      uid: order.uid || "",
      items: processedItems.map((item) => ({
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        company: item.company,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.totalPrice,
      })),
      subtotal: grandTotal,
      discount: 0,
      vat: 0,
      grandTotal,
      paymentStatus: "Unpaid",
      orderStatus: "Pending",
      createdAt: new Date(),
    };

    await invoiceCollection.insertOne(invoice);

    return res.status(201).json({
      success: true,
      message: "Order Placed Successfully",
      orderId: result.insertedId,
      invoiceNo,
      grandTotal,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 2. Get All Orders (ALL TIME - কোনো লিমিট ছাড়া সব অর্ডার আসবে)
// ======================================
const getOrders = async (req, res) => {
  try {
    const { orderCollection } = getCollections();

    // ✅ এখানে .limit(200) বাদ দেওয়া হয়েছে, তাই আগস্ট, সেপ্টেম্বর সহ All Time এর সব অর্ডার আসবে!
    const orders = await orderCollection
      .find({})
      .sort({ orderDate: -1, createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get Orders Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 3. Get My Orders By Email
// ======================================
const getMyOrders = async (req, res) => {
  try {
    const { orderCollection } = getCollections();
    const email = req.params.email;

    const orders = await orderCollection
      .find({ customerEmail: email })
      .sort({ orderDate: -1, createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Get My Orders Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 4. Update Order Status
// ======================================
// ======================================
// 4. Update Order Status, Payment & Due
// ======================================
const updateOrderStatus = async (req, res) => {
  try {
    const { orderCollection } = getCollections();
    const id = req.params.id;
    const { orderStatus, paymentStatus, paidAmount, dueAmount, dueNote } =
      req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Order ID format",
      });
    }

    const updateDoc = {};
    if (orderStatus !== undefined) updateDoc.orderStatus = orderStatus;
    if (paymentStatus !== undefined) updateDoc.paymentStatus = paymentStatus;
    if (paidAmount !== undefined) updateDoc.paidAmount = Number(paidAmount);
    if (dueAmount !== undefined) updateDoc.dueAmount = Number(dueAmount);
    if (dueNote !== undefined) updateDoc.dueNote = dueNote;
    updateDoc.updatedAt = new Date();

    const result = await orderCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc },
    );

    return res.status(200).json({
      success: true,
      message: "Order & Due Info Updated Successfully",
      result,
    });
  } catch (error) {
    console.error("Update Order Status Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 5. Get Invoice By Number
// ======================================
const getInvoiceByNumber = async (req, res) => {
  try {
    const { invoiceCollection } = getCollections();
    const invoiceNo = req.params.invoiceNo;

    const invoice = await invoiceCollection.findOne({ invoiceNo });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error("Get Invoice Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 6. Get Single Order By Id
// ======================================
const getSingleOrder = async (req, res) => {
  try {
    const { orderCollection } = getCollections();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Order ID format",
      });
    }

    const order = await orderCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get Single Order Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getOrderById = getSingleOrder;

// ======================================
// 7. Return/Refund Product & Update Invoice + Restock
// ======================================
const returnOrderItem = async (req, res) => {
  try {
    const { orderCollection, invoiceCollection, medicineCollection } =
      getCollections();
    const { id } = req.params;
    const { medicineId, returnQuantity } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Order ID format",
      });
    }

    const qtyToReturn = Math.max(1, Number(returnQuantity || 1));

    const order = await orderCollection.findOne({ _id: new ObjectId(id) });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // অর্ডারে আইটেমটি খোঁজা
    const itemIndex = order.items.findIndex(
      (item) => String(item.medicineId) === String(medicineId),
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found in this order",
      });
    }

    const currentItem = order.items[itemIndex];
    if (qtyToReturn > currentItem.quantity) {
      return res.status(400).json({
        success: false,
        message: `Cannot return ${qtyToReturn} units. Customer only bought ${currentItem.quantity} units.`,
      });
    }

    // ১. অর্ডারের আইটেম তালিকা আপডেট
    if (currentItem.quantity === qtyToReturn) {
      order.items.splice(itemIndex, 1);
    } else {
      currentItem.quantity -= qtyToReturn;
      currentItem.totalPrice = Number(
        (currentItem.quantity * currentItem.unitPrice).toFixed(2),
      );
      if (currentItem.purchasePrice) {
        currentItem.purchaseAmount = Number(
          (currentItem.quantity * currentItem.purchasePrice).toFixed(2),
        );
        currentItem.profit = Number(
          (currentItem.totalPrice - currentItem.purchaseAmount).toFixed(2),
        );
      }
    }

    // ২. নতুন Grand Total গণনা
    const newGrandTotal = order.items.reduce(
      (sum, it) => sum + Number(it.totalPrice || it.unitPrice * it.quantity),
      0,
    );
    const updatedGrandTotal = Number(newGrandTotal.toFixed(2));

    // ৩. অর্ডার ডাটাবেজে আপডেট
    await orderCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          items: order.items,
          grandTotal: updatedGrandTotal,
          updatedAt: new Date(),
        },
      },
    );

    // ৪. সংশ্লিষ্ট Invoice কালেকশনে আপডেট
    if (order.invoiceNo) {
      await invoiceCollection.updateOne(
        { invoiceNo: order.invoiceNo },
        {
          $set: {
            items: order.items.map((it) => ({
              medicineId: it.medicineId,
              medicineName: it.medicineName,
              company: it.company,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              total: it.totalPrice,
            })),
            subtotal: updatedGrandTotal,
            grandTotal: updatedGrandTotal,
            updatedAt: new Date(),
          },
        },
      );
    }

    // ৫. মেডিসিন স্টকে ফেরত যোগ করা (Restock)
    if (ObjectId.isValid(medicineId)) {
      await medicineCollection.updateOne(
        { _id: new ObjectId(medicineId) },
        { $inc: { stock: qtyToReturn } },
      );
    }

    return res.status(200).json({
      success: true,
      message: `Successfully returned ${qtyToReturn} units of ${currentItem.medicineName}. Invoice and stock updated!`,
      updatedGrandTotal,
      remainingItems: order.items,
    });
  } catch (error) {
    console.error("Return Order Item Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getMyOrders,
  updateOrderStatus,
  getInvoiceByNumber,
  getOrderById,
  getSingleOrder,
  returnOrderItem,
};
